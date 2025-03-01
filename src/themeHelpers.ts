import path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { ThemeConverter } from './themeConverter';

// Helper function to convert a specific theme
async function convertTheme(themeName: string): Promise<void> {
    try {
        const allThemes = getAllInstalledThemes();
        const themeMatch = allThemes.find(t => t.label === themeName);

        if (!themeMatch) {
            throw new Error(`Theme "${themeName}" not found`);
        }

        const themeData = await getThemeDataFromExtension(themeMatch.extension, themeMatch.label);

        if (!themeData) {
            throw new Error(`Could not retrieve theme data for ${themeName}`);
        }

        const warpTheme = ThemeConverter.convertTheme(themeData, themeName);
        const savedPath = await saveWarpTheme(warpTheme, themeName);

        vscode.window.showInformationMessage(`Successfully exported ${themeName} to Warp`);
    } catch (error) {
        throw new Error(`Error converting theme "${themeName}": ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function getThemeDataFromExtension(extension: vscode.Extension<any>, themeName: string): Promise<any> {
    try {
        if (!extension.packageJSON.contributes || !extension.packageJSON.contributes.themes) {
            return null;
        }

        const themeContributions = extension.packageJSON.contributes.themes;
        const themeContribution = themeContributions.find((t: any) => t.label === themeName || t.id === themeName);

        if (!themeContribution) {
            return null;
        }

        const themePath = path.join(extension.extensionPath, themeContribution.path);

        if (!fs.existsSync(themePath)) {
            throw new Error(`Theme file not found: ${themePath}`);
        }

        return JSON.parse(fs.readFileSync(themePath, 'utf8'));
    } catch (error) {
        throw new Error(`Error getting theme data: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Get currently active theme data
async function getCurrentThemeData(): Promise<{ themeData: any, themeName: string } | null> {
    try {
        const currentThemeName = vscode.workspace.getConfiguration('workbench').get('colorTheme');

        if (!currentThemeName) {
            throw new Error('Could not determine current theme');
        }

        for (const extension of vscode.extensions.all) {
            if (!extension.packageJSON.contributes || !extension.packageJSON.contributes.themes) {
                continue;
            }

            const themeContributions = extension.packageJSON.contributes.themes;
            const matchingTheme = themeContributions.find((t: any) => t.label === currentThemeName || t.id === currentThemeName);

            if (matchingTheme) {
                const themePath = path.join(extension.extensionPath, matchingTheme.path);

                if (!fs.existsSync(themePath)) {
                    continue; // Try next extension if file doesn't exist
                }

                const themeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
                return { themeData, themeName: currentThemeName as string };
            }
        }

        return null;
    } catch (error) {
        throw new Error(`Error retrieving current theme: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Get all installed themes
function getAllInstalledThemes(): { label: string, extension: vscode.Extension<any> }[] {
    try {
        const themes: { label: string, extension: vscode.Extension<any> }[] = [];

        for (const extension of vscode.extensions.all) {
            //skip all extension which do not have theme tags
            if (!extension.packageJSON.contributes || !extension.packageJSON.contributes.themes) {
                continue;
            }

            const themeContributions = extension.packageJSON.contributes.themes;
            for (const theme of themeContributions) {
                if (theme.label) {
                    themes.push({
                        label: theme.label,
                        extension
                    });
                }
            }
        }

        return themes;
    } catch (error) {
        throw new Error(`Error listing installed themes: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Save Warp theme
async function saveWarpTheme(warpTheme: any, themeName: string): Promise<string> {
    try {
        // Sanitize the theme name for use as a filename
        const sanitizedName = themeName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        const warpThemesDir = ThemeConverter.getWarpThemesDirectory();

        // Create warp themes directory if it doesn't exist
        if (!fs.existsSync(warpThemesDir)) {
            fs.mkdirSync(warpThemesDir, { recursive: true });
        }

        const filePath = path.join(warpThemesDir, `${sanitizedName}.yaml`);
        const yamlContent = ThemeConverter.generateYaml(warpTheme);
        fs.writeFileSync(filePath, yamlContent, 'utf8');

        return filePath;
    } catch (error) {
        throw new Error(`Error saving Warp theme: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Helper function to revert theme reliably
async function revertToTheme(themeId: string) {
    try {
        await vscode.workspace.getConfiguration('workbench').update('colorTheme', themeId, vscode.ConfigurationTarget.Global);
        // Force a UI refresh by notifying the user (optional)
        vscode.window.showInformationMessage(`Reverted to theme: ${themeId}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to revert theme: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export { getAllInstalledThemes, getCurrentThemeData, getThemeDataFromExtension, saveWarpTheme, convertTheme,revertToTheme };