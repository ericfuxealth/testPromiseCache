const _ = require('lodash')

// =========================================
// Setting up
// =========================================
const numberOfTests = 1000
const MaxInt = 999999999

const Timeout = 100
const called = {}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// simulates a long running function recording how many times each is called
// =================================================================================
function hardWorking(n) {
  const index = '' + n
  let count = called[index] || 0
  count++
  called[index] = count
  return n
}

// Wraps the long running function into a promise
// ============================
function hardWorkingPromise(n) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const result = hardWorking(n)
      resolve(result)
    }, Timeout)
  })
}

// Generates a cascading chain of calls to the promise wrapping the hardworking function
// testFunc is the different ways we test this.
// ============================
function compute(testFunc, n) {
  const breakdown = []
  while (n >= 10) {
    const c = n % 10
    breakdown.push(c)
    n = Math.floor(n / 10)
  }
  breakdown.push(n)

  return Promise.all(breakdown.map(n => testFunc(n))).then(a => _.sum(a))
}

async function tester(name, testFunc) {
  console.log(name)
  const numbers = [...Array(numberOfTests).keys()].map(() => getRandomInt(MaxInt))

  return Promise.all(numbers.map(n => compute(testFunc, n))).then(() => {
    console.log(called)
  })
}


// =========================================
// Test1: Caches the results only
// =========================================
class Test1 {
  constructor() {
    this.cache = {}
  }
  name() {
    return 'test1'
  }
  async testFunc(n) {
    if (this.cache['' + n] != null){
      return this.cache['' + n]
    }
    const result = await hardWorkingPromise(n)
    this.cache['' + n] = result
    return result
  }
}

// =========================================
// Test2: Caches the result as a promise
// =========================================
class Test2 {
  constructor() {
    this.cache = {}
  }
  name() {
    return 'test2'
  }
  async testFunc(n) {
    if (this.cache['' + n] != null) {
      return this.cache['' + n]
    }
    const result = await hardWorkingPromise(n)
    this.cache['' + n] = Promise.resolve(result)
    return result
  }
}

// =========================================
// Test3: Caches the actual call as a promise
// =========================================

function memoize(method) {
  let cache = {};
  return async function () {
    let args = JSON.stringify(arguments);
    cache[args] = cache[args] || method.apply(this, arguments);
    return cache[args];
  };
}

class Test3 {
  constructor() {
    this.memorizedNum = memoize(hardWorkingPromise)
  }
  name() {
    return 'test3'
  }
  async testFunc(n) {
    return this.memorizedNum(n)
  }
}

async function testall() {
  const t = new Test1() // Test2() Test3()
  await tester(t.name(), t.testFunc.bind(t))
}

testall()

