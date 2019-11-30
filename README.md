Examples showing how we can cache a promise to make sure it's never called more than once.

Caching the promise is not the same as caching the return value of the same promise, even though you wrap the value of Promise.resolve().

Run the tests by modifying testall.

Test1:
Caching the result of the promise. As you can see there is no caching at all and hardWorking() is called multiple times.

Test2:
No caching at all, even though you cache Promise.resolve(value)

Test3:
We cache the promise. Hence the hardWorking() is called no more than once for each value.

Test4:
Demonstrates how we can easily wrap any existing class by caching any methods that returns a promise to ensure it's never called more than once.
