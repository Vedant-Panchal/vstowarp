import * as yaml from 'js-yaml';
import * as os from 'os';
import path from 'path';
import * as vscode from 'vscode';

export class ThemeConverter {

  static convertTheme(themeData: any, themeName: string): any {
    try {
      if (!themeData || typeof themeData !== 'object') {
        throw new Error('Invalid theme data structure');
      }

      // Create a Warp theme structure
      const warpTheme = {
        accent: this.extractColor(themeData, 'statusBar.background') || '#0f7fcf',
        background: this.extractColor(themeData, 'editor.background') || '#1f1f1f',
        foreground: this.extractColor(themeData, 'editor.foreground') || '#cccccc',
        details: 'darker',
        terminal_colors: {
          normal: {
            black: this.extractColor(themeData, 'terminal.ansiBlack') || '#000000',
            red: this.extractColor(themeData, 'terminal.ansiRed') || '#cd3131',
            green: this.extractColor(themeData, 'terminal.ansiGreen') || '#0dbc79',
            yellow: this.extractColor(themeData, 'terminal.ansiYellow') || '#e5e510',
            blue: this.extractColor(themeData, 'terminal.ansiBlue') || '#2472c8',
            magenta: this.extractColor(themeData, 'terminal.ansiMagenta') || '#bc3fbc',
            cyan: this.extractColor(themeData, 'terminal.ansiCyan') || '#11a8cd',
            white: this.extractColor(themeData, 'terminal.ansiWhite') || '#e5e5e5'
          },
          bright: {
            black: this.extractColor(themeData, 'terminal.ansiBrightBlack') || '#666666',
            red: this.extractColor(themeData, 'terminal.ansiBrightRed') || '#f14c4c',
            green: this.extractColor(themeData, 'terminal.ansiBrightGreen') || '#23d18b',
            yellow: this.extractColor(themeData, 'terminal.ansiBrightYellow') || '#f5f543',
            blue: this.extractColor(themeData, 'terminal.ansiBrightBlue') || '#3b8eea',
            magenta: this.extractColor(themeData, 'terminal.ansiBrightMagenta') || '#d670d6',
            cyan: this.extractColor(themeData, 'terminal.ansiBrightCyan') || '#29b8db',
            white: this.extractColor(themeData, 'terminal.ansiBrightWhite') || '#e5e5e5'
          }
        },
        metadata: {
          origin_url: '',
          name: `${themeName} (VS Code)`,
          author: 'vstowarp'
        }
      };

      return warpTheme;
    } catch (error) {
      throw new Error(`Failed to convert theme: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper to extract colors from the theme
  private static extractColor(themeData: any, token: string): string | undefined {
    try {
      const colors = themeData.colors || {};
      return colors[token];
    } catch (error) {
      // Return undefined if token not found, no need to throw error here
      return undefined;
    }
  }

  // Get the default Warp themes directory
  static getWarpThemesDirectory(): string {
    try {
      const homeDir = os.homedir();
      return path.join(homeDir, 'AppData', 'Roaming','warp','Warp','data','themes'); //AppData\Roaming\warp\Warp\data\themes
    } catch (error) {
      throw new Error(`Failed to determine Warp themes directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Generate YAML for Warp theme
  static generateYaml(warpTheme: any): string {
    try {
      return yaml.dump(warpTheme);
    } catch (error) {
      throw new Error(`Failed to generate YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Preview a theme in VS Code
  static async previewTheme(themeName: string): Promise<boolean> {
    try {
      await vscode.workspace.getConfiguration('workbench').update('colorTheme', themeName, vscode.ConfigurationTarget.Global);
      return true;
    } catch (error) {
      throw new Error(`Failed to preview theme: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
