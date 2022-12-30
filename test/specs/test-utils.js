/*! resol-vbus | Copyright (c) 2013-present, Daniel Wippermann | MIT license */

const {
    SerialDataSourceProvider,
} = require('./resol-vbus');


const jestExpect = global.expect;
const expect = require('./expect');



const serialPortPath = process.env.RESOL_VBUS_SERIALPORT;



const testUtils = {

    expectPromise(promise) {
        // expect(promise).to.be.instanceOf(Promise);
        expect(promise).to.have.a.property('then').that.is.a('function');
        return promise;
    },

    async expectPromiseToReject(promise, ...args) {
        testUtils.expectPromise(promise);

        await promise.then(() => {
            jestExpect(() => {
                // nop
            }).toThrow(...args);
        }, err => {
            jestExpect(() => {
                throw err;
            }).toThrow(...args);
        });
    },

    expectRanges(ranges) {
        expect(ranges).a('array');

        const comparableRanges = ranges.map((range) => {
            return {
                minTimestamp: range.minTimestamp.toISOString(),
                maxTimestamp: range.maxTimestamp.toISOString(),
            };
        });

        return expect(comparableRanges);
    },

    adaptTimeout(timeout) {
        const factor = process.env.TRAVIS ? 1000 : 1;
        return timeout * factor;
    },

    serialPortPath,

    ifHasSerialPortIt(msg) {
        if (!SerialDataSourceProvider.hasSerialPortSupport) {
            xit(msg + ' (missing serial port support)', () => {});
        } else if (!serialPortPath) {
            xit(msg + ' (missing serial port path)', () => {});
        } else {
            it.apply(null, arguments);
        }
    },

    expectToBeABuffer(buffer) {
        expect(buffer).instanceOf(Buffer);
    },

    itShouldBeAClass(Class) {
        it('should be a class', () => {
            expect(Class).a('function')
                .property('prototype').an('object')
                .property('constructor');
        });
    },

    itShouldWorkCorrectlyAfterMigratingToClass(Class, ParentClass, instanceMembers, staticMembers) {
        it('should work correctly after migrating to Class', () => {
            jestExpect(typeof Class).toBe('function');
            if (ParentClass) {
                jestExpect(typeof ParentClass).toBe('function');
                jestExpect(Class.prototype).toBeInstanceOf(ParentClass);
            }

            function convertObject(obj, filter) {
                return Object.getOwnPropertyNames(obj || {}).filter(key => filter ? filter(key) : true).reduce((memo, key) => {
                    let value = obj [key];
                    if (value === Function) {
                        value = jestExpect.any(Function);
                    }
                    memo [key] = value;
                    return memo;
                }, {});
            }

            function filterOutStaticMembers(key) {
                switch (key) {
                case '__super__':
                case 'extend':
                case 'length':
                case 'name':
                case 'prototype':
                    return false;
                default:
                    return true;
                }
            }

            jestExpect(convertObject(Class.prototype)).toEqual(convertObject(instanceMembers));
            if (staticMembers) {
                jestExpect(convertObject(Class, filterOutStaticMembers)).toEqual(convertObject(staticMembers));
            }
        });
    },

    wrapAsPromise(fn) {
        return new Promise((resolve) => resolve(fn()));
    },

    expectOwnPropertyNamesToEqual(obj, expected) {
        jestExpect(Object.getOwnPropertyNames(obj).sort()).toEqual(expected.slice(0).sort());
    },

};



module.exports = testUtils;
