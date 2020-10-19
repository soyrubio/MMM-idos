/* Magic Mirror Module
 * Module: MMM-idos
 * Description: Display estimations for public transport stops in the Czech Republic
 *
 * By elrubio https://github.com/soyrubio
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const idos = require('./node-idos.js');

module.exports = NodeHelper.create({
    start: function() {
        console.log('Starting node helper for: ' + this.name);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'IDOS_STOP_INFO') {
            this.getDataForStop(payload.module_id,
                                payload.stop_id,
                                payload.ports);
        }
    },

    getDataForStop: function(module_id, stop_id, ports) {
        
        var self = this;
        idos.get_livetable(stop_id, ports).then(function(res) {
            self.sendSocketNotification('IDOS_UPDATE', {
                module_id: module_id,
                result: res
            });
        }).catch(function(err) {
            console.log("MMM-idos fetch error: " + err);
            self.sendSocketNotification('IDOS_FETCH_ERROR', {
                module_id: module_id
            });
        });
    }
});
