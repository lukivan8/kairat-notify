import axios from "axios";
import * as cheerio from "cheerio";
import { ButtonStatus, ParseResult } from "./types";
import fs from "fs/promises";

const BASE_URL = "https://fckairat.com/match";
const MATCH_BLOCK_SELECTOR = ".match-block";
const TICKET_BUTTON_SELECTOR = "a.match-block__tickets.skew.simple-filled-btn";
const TEAM_NAME_SELECTOR = ".match-block__name";

/**
 * Fetches and parses the FC Kairat match page to check button statuses
 * @returns Promise<ParseResult> - Object containing control and main button statuses
 */
export async function parseButtons(): Promise<ParseResult> {
    try {
        console.log("Fetching page:", BASE_URL);
        const response = await axios.get(BASE_URL, {
            timeout: 10000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });

        // const response = { data: await fs.readFile("kairat.html", "utf8") };

        const $ = cheerio.load(response.data);
        const matchBlocks = $(MATCH_BLOCK_SELECTOR);

        console.log(`Found ${matchBlocks.length} match blocks`);

        if (matchBlocks.length === 0) {
            throw new Error("No match blocks found on the page");
        }

        /**
         * Finds a match block by opponent team name
         * @param opponentName - Name of the opponent team to find
         * @returns ButtonStatus or null if not found
         */
        const findMatchByOpponent = (
            opponentName: string,
        ): ButtonStatus | null => {
            for (let i = 0; i < matchBlocks.length; i++) {
                const matchBlock = matchBlocks.eq(i);
                const teamNames = matchBlock.find(TEAM_NAME_SELECTOR);

                // Check if this match block contains the opponent team
                let foundOpponent = false;
                for (let j = 0; j < teamNames.length; j++) {
                    const teamName = teamNames.eq(j).text().trim();
                    if (teamName === opponentName) {
                        foundOpponent = true;
                        break;
                    }
                }

                if (foundOpponent) {
                    const button = matchBlock.find(TICKET_BUTTON_SELECTOR);
                    if (button.length === 0) {
                        console.warn(
                            `No ticket button found for ${opponentName}`,
                        );
                        continue;
                    }

                    const isEnabled = !button.hasClass("disabled");
                    const href = button.attr("href")
                        ? new URL(button.attr("href")!, BASE_URL).href
                        : "";

                    console.log(
                        `Match vs ${opponentName}: enabled=${isEnabled}, href=${href}`,
                    );
                    return { isEnabled, href };
                }
            }
            return null;
        };

        // Find matches by opponent names
        const aktobeMatch = findMatchByOpponent("Актобе");
        const realMadridMatch = findMatchByOpponent("Реал Мадрид");

        if (!aktobeMatch) {
            throw new Error("Match against Актобе not found on the page");
        }

        if (!realMadridMatch) {
            throw new Error("Match against Реал Мадрид not found on the page");
        }

        const result: ParseResult = {
            aktobe: aktobeMatch,
            realMadrid: realMadridMatch,
        };

        console.log("Parse result:", result);
        return result;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = `HTTP error: ${error.message}${
                error.response ? ` (Status: ${error.response.status})` : ""
            }`;
            console.error("Axios error:", errorMessage);
            throw new Error(errorMessage);
        }

        console.error("Parse error:", error);
        throw error;
    }
}

/**
 * Retries the parse operation once if it fails
 * @returns Promise<ParseResult> - Parsed button statuses
 */
export async function parseButtonsWithRetry(): Promise<ParseResult> {
    try {
        return await parseButtons();
    } catch (error) {
        console.log("First attempt failed, retrying...");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        return await parseButtons();
    }
}
