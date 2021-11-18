import { CommandHandler } from "./command-handler";
import { KernelsView } from '../views/kernels.view';
import { KernelNodeGroup } from '../views/providers/kernel-view-data.provider';

export class GroupKernelsByEnableStateCmd implements CommandHandler {

    constructor(private kernelsView: KernelsView) {}

    public async execute(): Promise<void> {
        this.kernelsView.groupKernelsBy(KernelNodeGroup.byEnableState);
    }
}
