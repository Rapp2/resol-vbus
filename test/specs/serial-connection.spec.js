/*! resol-vbus | Copyright (c) 2013-2018, Daniel Wippermann | MIT license */
'use strict';



const Duplex = require('stream').Duplex;


const expect = require('./expect');
const Q = require('./q');
const vbus = require('./resol-vbus');
const testUtils = require('./test-utils');



const SerialConnection = vbus.SerialConnection;



const SerialPortStub = vbus.extend(Duplex, {

    constructor: function(path, options, onCompletion) {
        const _this = this;

        Duplex.call(this);

        process.nextTick(function() {
            _this.emit('open');

            onCompletion(null);
        });
    },

    close: function() {
        // nop
    },

    _read: function() {
        // nop
    },

});



const TestableSerialConnection = SerialConnection.extend({

    createSerialPort: function(path, options, onCompletion) {
        return new SerialPortStub(path, options, onCompletion);
    }

});



const testConnection = function(done, callback) {
    const connection = new TestableSerialConnection({
        path: testUtils.serialPortPath,
    });

    Q.fcall(function() {
        expect(connection.connectionState).to.equal(SerialConnection.STATE_DISCONNECTED);

        return callback(connection);
    }).finally(function() {
        connection.disconnect();
    }).then(function() {
        done();
    }, function(err) {
        done(err);
    });
};



const ifHasSerialPortIt = testUtils.ifHasSerialPortIt;



describe('SerialConnection', function() {

    describe('constructor', function() {

        it('should be a constructor function', function() {
            expect(SerialConnection)
                .to.be.a('function')
                .that.has.a.property('extend')
                .that.is.a('function');
        });

        it('should have reasonable defaults', function() {
            const connection = new SerialConnection();

            expect(connection)
                .to.have.a.property('channel')
                .that.is.equal(0);
            expect(connection)
                .to.have.a.property('selfAddress')
                .that.is.equal(0x0020);
            expect(connection)
                .to.have.a.property('path')
                .that.is.equal(null);
        });

    });

    describe('#connect', function() {

        it('should be a method', function() {
            expect(SerialConnection.prototype).to.have.a.property('connect').that.is.a('function');
        });

        ifHasSerialPortIt('should work correctly if disconnected', function(done) {
            testConnection(done, function(connection, endpoint) {
                const onConnectionState = sinon.spy();

                connection.on('connectionState', onConnectionState);

                return Q.fcall(function() {
                    return connection.connect();
                }).then(function() {
                    expect(connection.connectionState).to.equal(SerialConnection.STATE_CONNECTED);
                    expect(onConnectionState.callCount).to.equal(2);
                    expect(onConnectionState.firstCall.args [0]).to.equal(SerialConnection.STATE_CONNECTING);
                    expect(onConnectionState.secondCall.args [0]).to.equal(SerialConnection.STATE_CONNECTED);
                }).finally(function() {
                    connection.removeListener('connectionState', onConnectionState);
                });
            });
        });

        ifHasSerialPortIt('should throw if not disconnected', function(done) {
            testConnection(done, function(connection, endpoint) {
                return Q.fcall(function() {
                    return connection.connect();
                }).then(function() {
                    expect(function() {
                        connection.connect();
                    }).to.throw();
                });
            });
        });

    });

    describe('#disconnect', function() {

        it('should be a method', function() {
            expect(SerialConnection.prototype).to.have.a.property('disconnect').that.is.a('function');
        });

        ifHasSerialPortIt('should work correctly if disconnected', function(done) {
            testConnection(done, function(connection) {
                connection.disconnect();

                expect(connection.connectionState).to.equal(SerialConnection.STATE_DISCONNECTED);
            });
        });

        ifHasSerialPortIt('should work correctly if connected', function(done) {
            testConnection(done, function(connection) {
                const onConnectionState = sinon.spy();

                connection.on('connectionState', onConnectionState);

                return Q.fcall(function() {
                    return connection.connect();
                }).then(function() {
                    return connection.disconnect();
                }).finally(function() {
                    connection.removeListener('connectionState', onConnectionState);
                });
            });
        });

    });

    describe('Automatic reconnection', function() {

        ifHasSerialPortIt('should reconnect when connected', function(done) {
            testConnection(done, function(connection) {
                const onConnectionState = sinon.spy();

                connection.on('connectionState', onConnectionState);

                return Q.fcall(function() {
                    return connection.connect();
                }).then(function() {
                    return connection.createConnectedPromise();
                }).then(function(socket) {
                    expect(onConnectionState.callCount).to.equal(2);
                    expect(onConnectionState.firstCall.args [0]).to.equal(SerialConnection.STATE_CONNECTING);
                    expect(onConnectionState.secondCall.args [0]).to.equal(SerialConnection.STATE_CONNECTED);

                    onConnectionState.reset();

                    connection.serialPort.emit('error');
                }).then(function() {
                    return connection.createConnectedPromise();
                }).then(function() {
                    expect(onConnectionState.callCount).to.equal(3);
                    expect(onConnectionState.firstCall.args [0]).to.equal(SerialConnection.STATE_INTERRUPTED);
                    expect(onConnectionState.secondCall.args [0]).to.equal(SerialConnection.STATE_RECONNECTING);
                    expect(onConnectionState.thirdCall.args [0]).to.equal(SerialConnection.STATE_CONNECTED);
                }).finally(function() {
                    connection.removeListener('connectionState', onConnectionState);
                });
            });

        });

    });

});
