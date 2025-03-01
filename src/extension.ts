import * as vscode from 'vscode';
import { ThemeConverter } from './themeConverter';
import { convertTheme, getAllInstalledThemes, getCurrentThemeData, getThemeDataFromExtension, revertToTheme, saveWarpTheme } from './themeHelpers';
import { convertAllCmd, convertCurrentCmd, selectAndConvertCmd } from './commands';


export function activate(context: vscode.ExtensionContext) {
	// Command: Preview theme
	const previewThemeCmd = vscode.commands.registerCommand('vstowarp.previewTheme', async () => {
		try {
			const allThemes = getAllInstalledThemes();
			const themeItems = allThemes.map(theme => ({
				label: theme.label
			}));

			const selectedTheme = await vscode.window.showQuickPick(themeItems, {
				placeHolder: 'Select a theme to preview'
			});

			if (!selectedTheme) {
				return;
			}

			// Store original theme to allow returning to it later
			const originalTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme') as string;
			
			// Preview the selected theme
			await ThemeConverter.previewTheme(selectedTheme.label);
			

			const choice = await vscode.window.showQuickPick(
				[
					{ label: 'Keep & Export', description: `Set the theme to ${selectedTheme.label} and export` },
					{ label: 'Export without keeping', description: `Export ${selectedTheme.label} without setting it to current theme` },
					{ label: 'Return to original', description: `Get back to original` }
				],
				{ placeHolder: `Previewing theme: ${selectedTheme.label}` }
			);
			console.log(choice);
			if (!choice) {
				await revertToTheme(originalTheme);
				return;
			}
			switch (choice.label) {
				case 'Keep & Export':
					// Keep theme and convert it
					await convertTheme(selectedTheme.label);
					break;
				case 'Export without keeping':
					// Revert to original theme and then convert selected theme
					// await vscode.commands.executeCommand('workbench.action.selectTheme', { theme: originalTheme });
					await revertToTheme(originalTheme);
					await convertTheme(selectedTheme.label);
					break;
				case 'Return to original':
				default:
					// Just revert to original theme
					await revertToTheme(originalTheme);
					break;
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error previewing theme: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(previewThemeCmd, convertCurrentCmd, convertAllCmd, selectAndConvertCmd);
}

export function deactivate() {
	vscode.window.showInformationMessage('The VsToWarp extension has been deactivated.');
}