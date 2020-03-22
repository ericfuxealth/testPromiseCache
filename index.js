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

// Generates a cascading chain of calls to the promise wrapping the hardworking function func
// ============================
function compute(func, n) {
  const breakdown = []
  while (n >= 10) {
    const c = n % 10
    breakdown.push(c)
    n = Math.floor(n / 10)
  }
  breakdown.push(n)

  return Promise.all(breakdown.map(n => func(n))).then(a => _.sum(a))
}

// Run numberOfTests number of simulations in parallel
// Each simulation takes a random number and calls func on that number (by calling compute)
async function tester(name, func) {
  console.log(name)
  const numbers = [...Array(numberOfTests).keys()].map(() => getRandomInt(MaxInt))

  return Promise.all(numbers.map(n => compute(func, n))).then(() => {
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

// ======================================================================
// Test4: Generic wrapper on any existing functions of a super class
// ======================================================================
const listOfFunctionsToWrap = ['testFunc']

// Caches the result of a method for a given object.
// The result is we will never call the same promise twice within the same object
function _memoize(method, targetObject) {
  targetObject.__promise_result_cache__ = targetObject.__promise_result_cache__ || {}
  // console.log('.... _memoize called targetObject.name', _memoize.name)
  return async function () {
    // eslint-disable-next-line prefer-rest-params
    const args = JSON.stringify(arguments)
    const cache = targetObject.__promise_result_cache__
    // @ts-ignore
    // eslint-disable-next-line prefer-rest-params
    cache[args] = cache[args] || method.apply(targetObject, arguments)
    // @ts-ignore
    return cache[args]
  }
}

class Test4 extends Test1 {
  name() {
    return 'test4'
  }

  constructor() {
    super()
    listOfFunctionsToWrap.forEach(func => {
      this[func] = _memoize(super[func], this)
    })
  }
}


// ======================================================================
// Test5: Override with class Prototype
// ======================================================================
class Test5 extends Test1 {
  name() {
    return 'test5'
  }
}

function wrapOverrides(prototypeChild, prototypeParent) {
  listOfFunctionsToWrap.forEach((method) => {
    if (prototypeParent[method]) {
      prototypeChild[method] = async function (...args) {
        // console.log('Running method ', method, 'of ', prototypeChild)
        return _memoize(prototypeParent[method], this)(...args)
      }
    } else {
      throw new Error(`Method ${method} is not defined`)
    }
  })
}

wrapOverrides(Test5.prototype, Test1.prototype)

async function testall() {
  const t = new Test5() // Test4() // Test2() Test3() Test4()
  await tester(t.name(), t.testFunc.bind(t))
}

testall()

