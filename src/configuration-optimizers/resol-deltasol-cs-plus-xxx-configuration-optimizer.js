/*! resol-vbus | Copyright (c) 2013-2018, Daniel Wippermann | MIT license */
'use strict';



const configurationData = require('./resol-deltasol-cs-plus-110-data');

const BaseConfigurationOptimizer = require('../base-configuration-optimizer');



class ResolDeltaSolCsPlusXxxConfigurationOptimizer extends BaseConfigurationOptimizer {

    optimizeConfiguration($) {
        // TODO?
    }

}


Object.assign(ResolDeltaSolCsPlusXxxConfigurationOptimizer, /** @lends ResolDeltaSolCsPlusXxxConfigurationOptimizer */ {

    deviceAddress: 0x2211,

    configurationData,

});



module.exports = ResolDeltaSolCsPlusXxxConfigurationOptimizer;
