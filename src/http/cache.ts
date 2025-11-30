export class Cache extends Map {
  private ttl = 60000;
  private schedules = new Map();

  constructor(ttl?: number) {
    super();
    if (ttl !== undefined) this.ttl = ttl;
  }

  public delete(key: K): boolean {
    const result = super.delete(key);
    clearTimeout(this.schedules.get(key));
    this.schedules.delete(key);
    return result;
  }

  public set(key: K, value: V | undefined, ttl = this.ttl): this {
    super.set(key, value);
    if (this.schedules.has(key)) {
      clearTimeout(this.schedules.get(key));
    }

    const schedule = setTimeout(() => {
      this.delete(key);
    }, ttl);
    this.schedules.set(key, schedule);
    return this;
  }

  public get(key: K): V | undefined {
    return super.get(key);
  }
}
