/*
  自定义Promise
*/

;(function (window) {
  const PENDING = 'pending'
  const RESOLVED = 'resolved'
  const REJECTED = 'rejected'
  /*
  Promise构造函数
  executor：执行器函数
*/
  function Promise(executor) {
    //将当前promise对象self保存起来
    const self = this
    self.status = PENDING // 给promise对象指定status属性，初始值为pending
    self.data = undefined // 给promise对象指定一个用于存储结果数据的属性
    self.callbacks = [] //每个元素的结构 {onResolved(){},onRejected(){}}

    function resolve(value) {
      //如果当前状态不是pending，直接结束
      if (self.status !== PENDING) {
        return
      }
      //将状态改为resolved
      self.status = RESOLVED
      //保存value数据
      self.data = value
      //如果有待执行callback函数，立即异步执行回调函数onResolved
      if (self.callbacks.length > 0) {
        setTimeout(() => {
          //放入队列执行所有成功的回调
          self.callbacks.forEach((callbacksObj) => {
            callbacksObj.onResolved(value)
          })
        })
      }
    }

    function reject(reason) {
      //如果当前状态不是pending，直接结束
      if (self.status !== PENDING) {
        return
      }
      //将状态改为rejected
      self.status = REJECTED
      //保存value数据
      self.data = reason
      //如果有待执行callback函数，立即异步执行回调函数onRejected
      if (self.callbacks.length > 0) {
        setTimeout(() => {
          //放入队列执行所有失败的回调
          self.callbacks.forEach((callbacksObj) => {
            callbacksObj.onRejected(reason)
          })
        })
      }
    }
    //立即执行executor
    try {
      executor(resolve, reject)
    } catch (error) {
      //如果执行器抛出异常，promise对象变为rejected状态
      reject(error)
    }
  }
  /*
  Promise原型对象then
  指定成功或失败的回调函数
  返回一个新的promise对象
*/
  Promise.prototype.then = function (onResolved, onRejected) {
    const self = this
    // 指定回调函数的默认值(必须是函数)
    onResolved = typeof onResolved === 'function' ? onResolved : (value) => value //向后传递成功的value
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason
          } //指定默认失败回调问题
    //返回一个新的promise对象
    return new Promise((resolve, reject) => {
      //调用指定回调函数处理
      function handle(callback) {
        /*
          1.如果抛出异常，return的promise就会失败，reason就是error
          2.如果回调函数返回不是promise，return的promise就会成功，value就是返回的值
          3.如果回调函数返回是promise，return的promise就是这个promise的结果
        */
        try {
          const result = callback(self.data)
          if (result instanceof Promise) {
            // 3.如果回调函数返回是promise，return的promise就是这个promise的结果
            result.then(resolve, reject)
          } else {
            //2.如果回调函数返回不是promise，return的promise就会成功，value就是返回的值
            resolve(result)
          }
        } catch (error) {
          //1.如果抛出异常，return的promise就会失败，reason就是error
          reject(error)
        }
      }

      //如果当前状态是pending，存储回调函数
      if (self.status === PENDING) {
        self.callbacks.push({
          onResolved() {
            handle(onResolved)
          },
          onRejected() {
            handle(onRejected)
          },
        })
      } else if (self.status === RESOLVED) {
        //如果当前是resolved状态，异步执行onResolved并改变return的promise状态
        setTimeout(() => {
          handle(onResolved)
        })
        /*
            1. 如果抛出异常，return的promise就会失败，reason就是error
            2.如果回调函数返回不是promise，return的promise就会成功，value就是返回的值
            3.如果回调函数返回是promise，return的promise就是这个promise的结果
          */
        // try {
        //   let result
        //   if(self.status == RESOLVED){
        //      result = onResolved(this.data)
        //   } else if (self.status == REJECTED) {
        //      result = onRejected(this.data)
        //   }
        //   if (result instanceof Promise) {
        //     // result.then(
        //     //   (value) => resolve(value), //当result成功时，让return的promise也成功
        //     //   (reason) => reject(reason) //当result失败时，让return的promise也失败
        //     // )
        //     result.then(resolve,reject)
        //   } else {
        //     resolve(result)
        //   }
        // } catch (error) {
        //   reject(error)
        // }
      } else if (self.status === REJECTED) {
        setTimeout(() => {
          handle(onRejected)
        })
      }
    })
  }

  /*
  Promise原型对象catch
  指定失败的回调函数
  返回一个新的promise对象
*/
  Promise.prototype.catch = function (onRejected) {
    return this.then(undefined, onRejected)
  }

  /*
  Promise函数对象resolve方法
  返回指定结果的一个成功的promise
*/
  Promise.resolve = function (value) {
    return new Promise((resolve, reject) => {
      if (value instanceof Promise) {
        value.then(resolve, reject)
      } else {
        resolve(value)
      }
    })
  }

  /*
  Promise函数对象reject方法
  返回一个指定reason的失败promise
*/
  Promise.reject = function (reason) {
    return new Promise((resolve, reject) => {
      reject(reason)
    })
  }

  /*
  Promise函数对象all方法
  返回一个promise，只有当所有promise都成功才成功，否则失败
*/
  Promise.all = function (promises) {
    return new Promise((resolve, reject) => {
      let values = new Array(promises.length) //缓存所有成功value的数组
      //用来保存promise成功的变量
      let resolvedCount = 0
      //遍历获取每个promise结果
      promises.forEach((p, index) => {
        Promise.resolve(p).then(
          //Promise.resolve(p) p有可能不是promise所以强制转为promise成功
          (value) => {
            values[index] = value
            resolvedCount++
            //如果全部成功 返回一个成功的promise
            if (promises.length === resolvedCount) {
              resolve(values)
            }
          },
          (reason) => {
            //只要一个失败了return promise就失败
            reject(reason)
          }
        )
      })
    })
  }

  /*
  Promise函数对象race方法
  返回一个promise，其结果由第一个完成的promise决定
*/
  Promise.race = function (promises) {
    return new Promise((resolve, reject) => {
      promises.forEach((p, index) => {
        Promise.resolve(p).then(
          (value) => {
            //一旦有成功，将return变为成功
            resolve(value)
          },
          (reason) => {
            //只要一个失败了return promise就失败
            reject(reason)
          }
        )
      })
    })
  }

  /*
  Promise函数对象resolveDelay方法
  返回一个promise，在指定时间后才确定结果
*/
  Promise.resolveDelay = function (value, time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (value instanceof Promise) {
          value.then(resolve, reject)
        } else {
          resolve(value)
        }
      }, time)
    })
  }

  /*
  Promise函数对象rejectDelay方法
  返回一个promise，在指定时间后才失败
*/
  Promise.rejectDelay = function (reason, time) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(reason)
      }, time)
    })
  }

  //向外暴露Promise
  window.Promise = Promise
})(window)
