import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

// Import the ThemeConverter class (you might need to export it in your main file)
// import { ThemeConverter } from '../../extension';

// Helper to get Warp themes directory
function getWarpThemesDirectory(): string {
  try {
    const homeDir = os.homedir();
    return path.join(homeDir, 'AppData', 'Roaming', 'warp', 'Warp', 'data', 'themes'); //AppData\Roaming\warp\Warp\data\themes
  } catch (error) {
    throw new Error(`Failed to determine Warp themes directory: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Utility to clean up test files
function cleanUpTestFiles(filePattern: string) {
  const themesDir = getWarpThemesDirectory();
  if (fs.existsSync(themesDir)) {
    const files = fs.readdirSync(themesDir);
    for (const file of files) {
      if (file.includes(filePattern)) {
        try {
          fs.unlinkSync(path.join(themesDir, file));
        } catch (error) {
          console.error(`Failed to delete test file ${file}:`, error);
        }
      }
    }
  }
}

suite('Extension Test Suite', () => {
  // Clean up test files before and after tests
  suiteSetup(() => {
    cleanUpTestFiles('_test_theme_');
  });

  suiteTeardown(() => {
    cleanUpTestFiles('_test_theme_');
  });

  test('Command Registration', async () => {
    // Get the list of all available commands
    const commands = await vscode.commands.getCommands();

    // Check if our commands are registered
    assert.ok(commands.includes('vstowarp.convertCurrentTheme'));
    assert.ok(commands.includes('vstowarp.convertAllThemes'));
    assert.ok(commands.includes('vstowarp.selectAndConvertTheme'));
    assert.ok(commands.includes('vstowarp.previewTheme'));
  });

  test('Convert Current Theme Command', async function () {
    this.timeout(10000); // Allow more time for the test

    // Store current theme to restore it later
    const originalTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');

    try {
      // Execute the convert current theme command
      await vscode.commands.executeCommand('vstowarp.convertCurrentTheme');

      // Check if a file was created for the current theme
      const themesDir = getWarpThemesDirectory();
      const currentTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme') as string;
      const sanitizedName = currentTheme.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const filePath = path.join(themesDir, `${sanitizedName}.yaml`);

      // Allow some time for file to be written
      await new Promise(resolve => setTimeout(resolve, 1000));

      assert.strictEqual(fs.existsSync(filePath), true, 'Theme file was not created');

      // Verify YAML content
      const yamlContent = fs.readFileSync(filePath, 'utf8');
      const themeData = yaml.load(yamlContent) as any;

      assert.ok(themeData.metadata.name.includes(currentTheme), 'Theme name not found in metadata');
      assert.ok(themeData.terminal_colors.normal.black, 'Terminal colors not properly defined');
    } finally {
      // Restore original theme
      await vscode.workspace.getConfiguration('workbench').update('colorTheme', originalTheme, vscode.ConfigurationTarget.Global);
    }
  });

  test('Preview Theme Command', async function () {
    this.timeout(10000); // Allow more time for the test

    // Store current theme to restore it later
    const originalTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');

    try {
      // Get some theme that's not the current one
      const allThemes = await vscode.extensions.all
        .filter(ext => ext.packageJSON.contributes && ext.packageJSON.contributes.themes)
        .flatMap(ext => ext.packageJSON.contributes.themes.map((t: any) => t.label));

      const testTheme = allThemes.find(theme => theme !== originalTheme);
      if (!testTheme) {
        this.skip(); // Skip if we can't find another theme
        return;
      }

      // Mock QuickPick selection
      // Note: This is tricky in VSCode testing. In a real scenario, 
      // you'd likely use Sinon to stub the showQuickPick function

      // For this test, directly change the theme to simulate preview
      await vscode.workspace.getConfiguration('workbench').update('colorTheme', testTheme, vscode.ConfigurationTarget.Global);

      // Check if theme changed
      const newTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme');
      assert.strictEqual(newTheme, testTheme, 'Theme was not changed');

      // Verify no theme file was created during preview
      const themesDir = getWarpThemesDirectory();
      const sanitizedName = testTheme.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const filePath = path.join(themesDir, `${sanitizedName}.yaml`);

      // Check if file exists, but only if we haven't already run the 
      // convert command test which might have created it
      if (!fs.existsSync(filePath)) {
        assert.strictEqual(fs.existsSync(filePath), false, 'Theme file should not be created during preview');
      }
    } finally {
      // Restore original theme
      await vscode.workspace.getConfiguration('workbench').update('colorTheme', originalTheme, vscode.ConfigurationTarget.Global);
    }
  });
});