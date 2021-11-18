// MimeTypes contains available cell output mime types.
export enum MimeTypes {
    stdError  = 'application/vnd.code.notebook.error',
    stdTest   = 'application/cellementary.test',
    plainText = 'text/plain'
}

// Configuration contains available extension configurations.
export enum Configuration {
    kernels = 'kernels'
}

// KernelConfig represents kernels configuration object.
export interface KernelConfig {
    kernelType: string;
    isEnabled:  boolean;
}
