import * as vscode from 'vscode';

// ConfigurationService represents extension configuration service.
export class ConfigurationService {
    constructor(private context: vscode.ExtensionContext) {}

    public getConfiguration(cfgName: string, defaultValue?: any) : any {
        return vscode.workspace
            .getConfiguration(this.context.extension.packageJSON.name)
            .get(cfgName) || defaultValue;
    }

    public async setConfiguration(cfgName: string, value: any) : Promise<void> {
        await vscode.workspace
            .getConfiguration(this.context.extension.packageJSON.name)
            .update(cfgName, value, vscode.ConfigurationTarget.Global);
    }

    public get coreSection() : string {
        return this.context.extension.packageJSON.name;
    }
}
