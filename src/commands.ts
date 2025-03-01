import * as vscode from 'vscode';
import { convertTheme, getAllInstalledThemes, getCurrentThemeData, getThemeDataFromExtension, saveWarpTheme } from './themeHelpers';
import { ThemeConverter } from './themeConverter';
const convertCurrentCmd = vscode.commands.registerCommand('vstowarp.convertCurrentTheme', async () => {
    try {
        const themeInfo = await getCurrentThemeData();

        if (!themeInfo) {
            throw new Error('Could not retrieve the current theme data');
        }

        const warpTheme = ThemeConverter.convertTheme(themeInfo.themeData, themeInfo.themeName);
        const savedPath = await saveWarpTheme(warpTheme, themeInfo.themeName);

        vscode.window.showInformationMessage(`Successfully exported ${themeInfo.themeName} to Warp`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error converting current theme: ${error instanceof Error ? error.message : String(error)}`);
    }
});

// Command: Convert all installed themes
const convertAllCmd = vscode.commands.registerCommand('vstowarp.convertAllThemes', async () => {
    try {
        const allThemes = getAllInstalledThemes();

        if (allThemes.length === 0) {
            throw new Error('No themes found to convert');
        }

        // Show progress indicator
        const convertedThemes = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Converting VS Code themes to Warp format",
            cancellable: true
        }, async (progress, token) => {
            const convertedList: string[] = [];
            const totalThemes = allThemes.length;
            let processedCount = 0;

            for (const theme of allThemes) {
                // Check for cancellation
                if (token.isCancellationRequested) {
                    break;
                }

                try {
                    const themeData = await getThemeDataFromExtension(theme.extension, theme.label);

                    if (themeData) {
                        const warpTheme = ThemeConverter.convertTheme(themeData, theme.label);
                        await saveWarpTheme(warpTheme, theme.label);
                        convertedList.push(theme.label);
                    }
                } catch (error) {
                    // Log error but continue with other themes
                    console.error(`Error converting theme ${theme.label}: ${error}`);
                }

                processedCount++;
                progress.report({
                    message: `${processedCount}/${totalThemes} themes processed`,
                    increment: (1 / totalThemes) * 100
                });
            }

            return convertedList;
        });

        if (convertedThemes.length === 0) {
            vscode.window.showWarningMessage('No themes were converted');
        } else {
            vscode.window.showInformationMessage(`Successfully exported ${convertedThemes.length} themes to Warp`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error converting themes: ${error instanceof Error ? error.message : String(error)}`);
    }
});

// Command: Select a theme to convert
const selectAndConvertCmd = vscode.commands.registerCommand('vstowarp.selectAndConvertTheme', async () => {
    try {
        const allThemes = getAllInstalledThemes();

        if (allThemes.length === 0) {
            throw new Error('No themes found to convert');
        }

        const themeItems = allThemes.map(theme => ({
            label: theme.label
        }));

        const selectedThemes = await vscode.window.showQuickPick(themeItems, {
            placeHolder: 'Select a theme to convert to Warp format',
            canPickMany: true
        });

        if (!selectedThemes || selectedThemes.length === 0) {
            return;
        }
        for (const selectedTheme of selectedThemes) {
            convertTheme(selectedTheme.label);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error selecting theme: ${error instanceof Error ? error.message : String(error)}`);
    }
});

export { convertAllCmd, convertCurrentCmd, selectAndConvertCmd }