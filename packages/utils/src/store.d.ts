declare module "store" {
  interface StoreAPI {
    enabled: boolean;
    get(key: string): any;
    set(key: string, value: any): void;
    remove(key: string): void;
    clearAll(): void;
    each(callback: (value: any, key: string) => void): void;
  }

  const store: StoreAPI;
  export default store;
}
