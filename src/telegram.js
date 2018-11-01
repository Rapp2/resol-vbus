/*! resol-vbus | Copyright (c) 2013-2018, Daniel Wippermann | MIT license */
'use strict';



const sprintf = require('sprintf-js').sprintf;


const Header = require('./header');
const _ = require('./lodash');



const optionKeys = [
    'command',
];



const Telegram = Header.extend(/** @lends Telegram# */ {

    /**
     * The VBus command of this Telegram instance.
     * @type {number}
     */
    command: 0,

    frameData: null,

    /**
     * Creates a new Telegram instance.
     *
     * @constructs
     * @augments Header
     * @param {object} options Initialization options.
     */
    constructor: function(options) {
        Header.call(this, options);

        _.extend(this, _.pick(options, optionKeys));

        if (_.has(options, 'frameData') && _.has(options, 'dontCopyFrameData') && options.dontCopyFrameData) {
            this.frameData = options.frameData;
        } else {
            this.frameData = Buffer.alloc(3 * 7);
            this.frameData.fill(0);

            if (_.has(options, 'frameData')) {
                const minLength = Math.min(this.frameData.length, options.frameData.length);
                options.frameData.copy(this.frameData, 0, 0, minLength);
            }
        }
    },

    toLiveBuffer: function(origBuffer, start, end) {
        const frameCount = this.getFrameCount();
        const length = 8 + frameCount * 9;

        let buffer;
        if (origBuffer === undefined) {
            buffer = Buffer.alloc(length);
        } else if (start + length <= end) {
            buffer = origBuffer.slice(start, start + length);
        } else {
            throw new Error('Buffer too small');
        }

        buffer [0] = 0xAA;
        buffer.writeUInt16LE(this.destinationAddress & 0x7F7F, 1);
        buffer.writeUInt16LE(this.sourceAddress & 0x7F7F, 3);
        buffer [5] = 0x30;
        buffer [6] = this.command & 0x7F;
        Telegram.calcAndSetChecksumV0(buffer, 1, 7);

        for (let i = 0; i < frameCount; i++) {
            const srcStart = 7 * i;
            const dstStart = 8 + 9 * i;
            Telegram.extractSeptett(this.frameData, srcStart, srcStart + 7, buffer, dstStart);
            Telegram.calcAndSetChecksumV0(buffer, dstStart, dstStart + 8);
        }

        return buffer;
    },

    getProtocolVersion: function() {
        return 0x30;
    },

    getId: function() {
        const baseId = Header.prototype.getId.call(this);
        return sprintf('%s_%02X', baseId, this.command);
    },

    compareTo: function(that) {
        let result = Header.prototype.compareTo.apply(this, arguments);
        if (result === 0) {
            result = this.command - that.command;
        }
        return result;
    },

    getFrameCount: function() {
        return Telegram.getFrameCountForCommand(this.command);
    },

}, /** @lends Telegram */ {

    fromLiveBuffer: function(buffer, start, end) {
        const frameCount = this.getFrameCountForCommand(buffer [start + 6]);

        const frameData = Buffer.alloc(3 * 7);
        frameData.fill(0);

        for (let i = 0; i < frameCount; i++) {
            const srcStart = start + 8 + 9 * i;
            const dstStart = 7 * i;
            Telegram.injectSeptett(buffer, srcStart, srcStart + 7, frameData, dstStart);
        }

        return new Telegram({
            destinationAddress: buffer.readUInt16LE(start + 1),
            sourceAddress: buffer.readUInt16LE(start + 3),
            command: buffer [start + 6],
            frameData: frameData,
            dontCopyFrameData: true
        });
    },

    getFrameCountForCommand: function(command) {
        return ((command >> 5) & 0x03);
    }

});



module.exports = Telegram;
