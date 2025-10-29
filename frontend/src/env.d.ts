/// <reference types="vite/client" />

// Allows imports like `import something from '@/components/MyComponent.vue'`
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<object, object, any>
    export default component
}

// Optionally define your environment variables (from .env)
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
