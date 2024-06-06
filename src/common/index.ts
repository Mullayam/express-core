export class DIContainer {
    private static services = new Map<string, any>();

    /**
     * Registers a class in the DIContainer.
     *
     * @param {new (...args: any[]) => T} target - The class to be registered.
     * @return {void} This function does not return anything.
     */
    public static register<T>(target: { new(...args: any[]): T }): void {
        const className = target.name;
        if (!DIContainer.services.has(className)) {
            DIContainer.services.set(className, new target());
        }
    }

    /**
     * Resolves a dependency from the DIContainer by its class name.
     *
     * @param {new (...args: any[]) => T} target - The class to resolve.
     * @return {T} The resolved dependency.
     * @throws {Error} If the dependency is not found.
     */
    public static resolve<T>(target: { new(...args: any[]): T }): T {
        const className = target.name;
        const service = DIContainer.services.get(className);

        if (!service) {
            throw new Error(`Dependency not found: ${className}`);
        }
        return service;
    }
}
