import {
    asapScheduler,
    asyncScheduler,
    Clock,
    from,
    Observable,
    of,
    merge,
    partition,
    publish,
    range,
    route,
    split,
    subscribe,
    timestamp,
    zip
} from "../observable.js"
import {avg, delay,
    distinct, distinctUntilChanged, distinctUntilKeyChanged,
    elementAt,
    filter, first,
    ignoreElements,
    map, max, min, product, reduce,
    scan, single,
    skip, skipUntil, skipUntilTime, skipWhile, sum,
    take, takeUntil, takeUntilTime, takeWhile,
    when} from "../operators.js"

test("of",(done) => {
    const result = [];
    of(1,2,3)
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            expect(result[2]).toBe(3);
            done();
        });
})

test("avg",(done) => {
    const result = [];
    from([1,2,3,4])
        .pipe(avg((value) => value % 2 ===0))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(3);
            done();
        });
})

test("delay - async (default)", (done) => {
    const result = [],
        start = Date.now();
    of(1,2,3)
        .pipe(delay(1000))
        .subscribe((value) => {
                result.push(value)
            }, () => {
                expect(Date.now()>=start+3000);
                expect(result.length).toBe(3);
                expect(result[0]).toBe(1);
                expect(result[1]).toBe(2);
                expect(result[2]).toBe(3);
                done();
            })
})

test("delay - null", (done) => {
    const result = [],
        start = Date.now();
    of(1,2,3)
        .pipe(delay(1000,null))
        .subscribe((value) => {
            result.push(value)
        }, () => {
            expect(Date.now()>=start+3000);
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            expect(result[2]).toBe(3);
            done();
        })
})

test("delay - asap", (done) => {
    const result = [],
        start = Date.now();
    of(1,2,3)
        .pipe(delay(1000, asapScheduler))
        .subscribe((value) => {
            result.push(value)
        }, () => {
            expect(Date.now()>=start+3000)
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            expect(result[2]).toBe(3);
            done();
        })
})

test("distinct",(done) => {
    const result = [];
    of({name:"joe"},{name:"ann"},{name:"joe"})
        .pipe(distinct(({name}) => name))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0].name).toBe("joe");
            expect(result[1].name).toBe("ann");
            done();
        })
})

test("distinctUntilChanged",(done) => {
    const result = [];
    of({name:"joe"},{name:"joe"},{name:"ann"},{name:"joe"})
        .pipe(distinctUntilChanged((current,previous) => current===previous,({name}) => name))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0].name).toBe("joe");
            expect(result[1].name).toBe("ann");
            expect(result[2].name).toBe("joe");
            done();
        })
})

test("distinctUntilKeyChanged",(done) => {
    const result = [];
    of({name:"joe"},{name:"joe"},{name:"ann"},{name:"joe"})
        .pipe(distinctUntilKeyChanged("name"))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0].name).toBe("joe");
            expect(result[1].name).toBe("ann");
            expect(result[2].name).toBe("joe");
            done();
        })
})

test("elementAt",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(elementAt(2))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(3);
            done();
        })
})

test("filter",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(filter((value) => value!==2))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(3);
            done();
        })
})


test("filter delayed",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(delay(),filter((value) => value!==2))
        .subscribe((value) => {
            result.push(value)
        }, () => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(3);
            done();
        })
})


test("first",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(first((value,index) => index===1))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(2);
            done();
        })
})

test("from",(done) => {
    const result = [];
    from([1,2,3])
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            expect(result[2]).toBe(3);
            done();
        });
})


test("ignoreElements",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(ignoreElements())
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(0);
            done();
        })
})

test("merge", (done) => {
    const result = [],
        o1 = from([1,2,3]),
        o2 = from([4,5,6]),
        merged = merge(o1,o2);
    merged.subscribe((value) => {
        result.push(value)
    },() => {
        expect(result.length).toBe(6);
        done();
    })
})

test("max",(done) => {
    const result = [];
    from([1,3,2])
        .pipe(max())
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(3);
            done();
        });
})

test("min",(done) => {
    const result = [];
    from([2,3,1])
        .pipe(min())
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(1);
            done();
        });
})

test("partition", (done) => {
    const result1 = [],
        result2 = [],
        [o1,o2] = partition(from([1,2,3,4,5]),(value) => value % 2 ===0);
    Promise.all([
        new Promise((resolve) => {
            o1.subscribe((value) => {
                result1.push(value)
            },() => {
                expect(result1.length).toBe(2);
                resolve();
            })
        }),
        new Promise((resolve) => {
            o2.subscribe((value) => {
                result2.push(value)
            },() => {
                expect(result2.length).toBe(3);
                resolve();
            })
        })]).then(() => {
                done();
            })
})


test("product",(done) => {
    const result = [];
    from([1,2,3,4])
        .pipe(product((value) => value % 2 ===0))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(8);
            done();
        });
})

test("range",(done) => {
    const result = [];
    range(1,3)
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            expect(result[2]).toBe(3);
            done();
        })
})

test("reduce",(done) => {
    const result = [];
    from([1,2,3])
        .pipe(reduce((accum,curr) => accum + curr))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(6);
            done();
        });
})

test("reduce - seed",(done) => {
    const result = [];
    from([1,2,3])
        .pipe(reduce((accum,curr) => accum + curr,1))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(7);
            done();
        });
})

test("route", async () => {
    const results = [],
        observable = Observable()
            .route("/r1",(path) => results.push(path))
            .route(/\/a.*/,(path) => results.push(path))
            .route({name:"joe"},(value) => results.push(value))
            .route({name:"mary"},(object) => object===currentuser ? object : undefined,(object) => results.push(object));
    const p1 = {name:"joe"},
        p2 = {name:"mary"},
        p3 = {name:"mary"},
        currentuser = p3;
    for(const item of ["/r1","/abc",p1,p2,p3]) {
        await publish(item,observable)
    }
    expect(results.length).toBe(4);
    expect(results[0]).toBe("/r1");
    expect(results[1]).toBe("/abc");
    expect(results[2]===p1).toBe(true);
    expect(results[3]===p3).toBe(true);
})

test("scan",(done) => {
    const result = [];
    from([1,2,3])
        .pipe(scan((accum,curr) => accum + curr))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(3);
            expect(result[2]).toBe(6);
            done();
        });
})

test("scan - seed",(done) => {
    const result = [];
    from([1,2,3])
        .pipe(scan((accum,curr) => accum + curr,1))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(2);
            expect(result[1]).toBe(4);
            expect(result[2]).toBe(7);
            done();
        });
})

test("single",(done) => {
    const result = [];
    range(1)
        .pipe(single())
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(1);
            done();
        })
})

test("single - none",(done) => {
    const result = [];
    range()
        .pipe(single())
        .subscribe((value) => {
            result.push(value)
        },() => {

        }, (err) => {
            expect(err).toBeInstanceOf(TypeError);
            done();
        })
})

test("single - more than one",(done) => {
    const result = [];
    range(1,2)
        .pipe(single())
        .subscribe((value) => {
            result.push(value)
        },() => {

        }, (err) => {
            expect(err).toBeInstanceOf(TypeError);
            done();
        })
})

test("skip",(done) => {
    const result = [],
        observable = Observable();
    from([1,1,1,2,3])
        .pipe(skip(3))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(2);
            expect(result[1]).toBe(3);
            done();
        });
})

test("skipUntil",(done) => {
    const result = [],
        observable = Observable();
    from([1,1,1,2,3])
        .pipe(when(2,() => publish(1,observable)),skipUntil(observable))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(2);
            expect(result[1]).toBe(3);
            done();
        });
})

test("skipUntilTime",(done) => {
    const result = [],
        future = Date.now() + 1000;
    from([1,2,3,4,5])
        .pipe(delay(500),skipUntilTime(future))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(4);
            done();
        });
})

test("skipUntilTime - Clock",(done) => {
    const result = [],
        clock = new Clock({speed:.5,run:true}),
        future = Date.now() + 1000;
    from([1,2,3,4,5])
        .pipe(delay(500),skipUntilTime(future,clock))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            done();
        });
})

test("skipUntilTime - Delay Clock",(done) => {
    const result = [],
        clock = new Clock({speed:.5,run:true}),
        future = Date.now() + 1000;
    from([1,2,3,4,5])
        .pipe(delay(500,asyncScheduler,clock),skipUntilTime(future))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(4);
            done();
        });
})

test("skipWhile",(done) => {
    const result = [];
    from([1,1,1,2,3])
        .pipe(skipWhile((value) => value === 1))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(2);
            expect(result[1]).toBe(3);
            done();
        });
})

test("sum",(done) => {
    const result = [];
    from([1,2,3])
        .pipe(sum((value) => value % 2 ===0))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0]).toBe(2);
            done();
        });
})

test("take",(done) => {
    const result = [];
    of(1,2,3)
        .pipe(take(2))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);
            done();
        })
})

test("takeUntil",(done) => {
    const result = [],
        observable = Observable();
    from([1,1,1,2,3])
        .pipe(when(2,() => publish(1,observable)),takeUntil(observable))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(1);
            expect(result[2]).toBe(1);
            done();
        });
})

test("takeUntilTime",(done) => {
    const result = [],
        future = Date.now() + 1000;
    from([1,2,3,4,5])
        .pipe(takeUntilTime(future),delay(500))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(2);
            done();
        });
})

test("takeWhile",(done) => {
    const result = [];
    from([1,1,1,2,3])
        .pipe(takeWhile((value) => value === 1))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(3);
            expect(result[0]).toBe(1);
            expect(result[1]).toBe(1);
            expect(result[2]).toBe(1);
            done();
        });
})

test("timestamp",(done) => {
    const result = [],
        clock = new Clock(),
        now = clock.now();
    from([1])
        .pipe(timestamp(clock))
        .subscribe((value) => {
            result.push(value)
        },() => {
            expect(result.length).toBe(1);
            expect(result[0].timestamp).toBe(now);
            done();
        });
})

test("zip", (done) => {
    const result = [];
    const age$ = of(27, 25, 29);
    const name$ = of('Foo', 'Bar', 'Beer');
    const isDev$ = of(true, true, false);

    zip(age$, name$, isDev$).pipe(
        map(([age, name, isDev]) => ({ age, name, isDev }))
    ).subscribe((value) => {
        result.push(value);
    }, () => {
        expect(result.length).toBe(3);
        done();
    });
})
