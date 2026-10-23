/** Wait for a Promise operation and its single callback, even if the operation rejects first.
 * This is Promise interoperability: observe rejections immediately and reject late callbacks. */
export const joinCallback = async <Args extends unknown[], A, B>(
  operation: (callback: (...args: Args) => Promise<B>) => Promise<A>,
  callback: (...args: Args) => Promise<B>,
): Promise<A> => {
  let work: Promise<B> | undefined;
  let accepting = true;
  const invoke = (...args: Args): Promise<B> => {
    const result =
      accepting && !work
        ? Promise.resolve().then(() => callback(...args))
        : Promise.reject(
            new Error("Persistence callback invoked after settlement or more than once"),
          );
    void result.catch(() => {});
    if (accepting && !work) work = result;
    return result;
  };
  const [result] = await Promise.allSettled([Promise.resolve().then(() => operation(invoke))]);
  accepting = false;
  const [body] = await Promise.allSettled(work ? [work] : []);
  if (result.status === "rejected") throw result.reason;
  if (body?.status === "rejected") throw body.reason;
  return result.value;
};
