/* Magic Mirror Module
 * Module: MMM-idos
 * Description: Display estimations for public transport stops in the Czech Republic
 *
 * By elrubio https://github.com/soyrubio
 * MIT Licensed.
 */

Module.register('MMM-idos', {
	defaults: {
		maximumEntries: 5,
		refreshInterval: 60000, // in milliseconds
		displaySymbol: true,
		displayLineNumber: true,
		displayDestination: true,

		fadePoint: 0.25, // Start on the 1/4th of the list
		fade: true,
        blink: true,
        torPorts: []
	},

	getStyles: function () {
		return ['font-awesome.css', this.file('MMM-idos.css')];
	},

	getTranslations: function () {
		return {
			en: "translations/en.json",
            sk: "translations/sk.json",
            cz: "translations/sk.json",
		}
	},

	start: function () {
		Log.log('Starting module: ' + this.name);

		this.livetable = {};

		this.idos_loaded = false;
		this.idos_fetch_error = false;

		this.scheduleUpdate();
		this.updateDom();
	},

	getDom: function () {
		var wrapper = document.createElement('div');

		if (this.idos_fetch_error) {
			wrapper.innerHTML = this.translate('IDOS_FETCH_ERROR');
			wrapper.className = 'dimmed light small';
			return wrapper;
		}

		if (!(this.idos_loaded)) {
			wrapper.innerHTML = this.translate('LOADING');
			wrapper.className = 'dimmed light small';
			return wrapper;
		}

		/* process data */
		var all_lines = this.livetable;
		all_lines = all_lines.slice(0, this.config.maximumEntries);

		if (this.config.fade && this.config.fadePoint < 1) {
			if (this.config.fadePoint < 0) {
				this.config.fadePoint = 0;
			}
			var start_fade = all_lines.length * this.config.fadePoint;
			var fade_steps = all_lines.length - start_fade;
		}

		var table = document.createElement('table');
		table.className = 'small';

		if (all_lines.length > 0) {
			for (var i = 0; i < all_lines.length; i++) {
				var line = all_lines[i];

				var row = document.createElement('tr');

				/* row fading */
				if (i + 1 >= start_fade) {
					var curr_fade_step = i - start_fade;
					row.style.opacity = 1 - (1 / fade_steps * curr_fade_step);
				}

				/* display symbol */
				if (this.config.displaySymbol) {
					var w_symbol_td = document.createElement('td');
					var w_symbol = document.createElement('span');
					w_symbol.className = 'fa fa-fw fa-' + line.type;
					w_symbol_td.appendChild(w_symbol);
					row.appendChild(w_symbol_td);
				}

				/* display line number */
				if (this.config.displayLineNumber) {
					var w_line_num_td = document.createElement('td');
					w_line_num_td.className = 'idos-padding-left align-right';
					w_line_num_td.innerHTML = line.number;
					row.appendChild(w_line_num_td);
				}

				/* display destination */
				if (this.config.displayDestination) {
					var w_dest_td = document.createElement('td');
					w_dest_td.className = 'idos-padding-left align-left idos-destination';
					w_dest_td.innerHTML = line.destination;
					row.appendChild(w_dest_td);
				}

				/* display time left */
				var w_time_td = document.createElement('td');
				w_time_td.className = 'align-right idos-departure';
				if (this.config.blink) {
					w_time_td.className += 'blink';
				}
				var departure_time = this.getDepartureTime(line);
				w_time_td.innerHTML = departure_time;
				row.appendChild(w_time_td);

				/* display delay dot */
				var dot_td = document.createElement('td');
				dot_td.className = 'idos-delay-dot'
				if (this.config.blink) {
					w_time_td.className += 'blink';
				}
				if (line.delay !== "0") {
					dot_td.innerHTML = "&bull;";
				}
				row.appendChild(dot_td);

				/* departuring now should blink */
				row.className = 'bright'
				if (this.config.blink && departure_time === "<1 min")
					row.className += ' blinking';

				table.appendChild(row);
			}
		} else {
			var row = document.createElement('tr');
			table.appendChild(row);

			var no_line_cell = document.createElement('td');
			no_line_cell.className = 'dimmed light small';
			no_line_cell.innerHTML = this.translate('IDOS_NO_LINES');
			row.appendChild(no_line_cell);
		}

		wrapper.appendChild(table);
		return wrapper;
	},

	socketNotificationReceived: function (notification, payload) {
		if (payload.module_id == this.identifier) {
			if (notification === 'IDOS_UPDATE') {
				this.idos_loaded = true;
				this.idos_fetch_error = false;
				this.livetable = payload.result;
				this.updateDom();
			} else if (notification === 'IDOS_FETCH_ERROR') {
				this.idos_fetch_error = true;
				this.updateDom();
			}
		}
	},

	scheduleUpdate: function () {
		this.sendSocketNotification('IDOS_STOP_INFO', {
			module_id: this.identifier,
            stop_id: this.config.stopId,
            ports: this.config.torPorts
		});

		var self = this;
		setTimeout(function () {
			self.scheduleUpdate();
		}, this.config.refreshInterval);
	},

	getDepartureTime: function (line) {
		var now = new Date();
		var time = line.departure.split(":");
		var departure = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time[0], time[1], 0);
		var diff = (departure - now) / 60000;
		departure.setMinutes(departure.getMinutes() + parseInt(line.delay));
		diff = (departure - now) / 60000;
		if (diff < 1) {
			diff = "<1"
		} else {
			diff = Math.round(diff);
		}
		diff += " min"
		return diff;
	}
});
