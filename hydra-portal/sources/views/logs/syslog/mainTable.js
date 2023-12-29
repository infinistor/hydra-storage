/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
import { JetView } from "webix-jet";

import { levelToIcons, center } from "../../../functions/levelToIconTemplate";
import { ajaxFail } from "../../../functions/ajaxFail";

export default class MainTable extends JetView {
	config() {
		var searchResult = ""
		var firstDateFilterSkip = false
		var dateFilterValue

		function filterByDate(value, filter, obj) {
			// moved to backend --> refer to onBeforeFilter function
			return true
		}

		function messageFilter(value, filter, obj) {
			if (!obj.$group) {
				if (value) {
					if (filter) {
						if (value.toLowerCase().includes(filter.toLowerCase())) {
							return true
						} else {
							return false
						}
					} else {
						return true
					}
				}
			}
		}

		function searchColumnTemplate(data, type, value) {
			let search = searchResult
			// if(highlight_list.length > 0) {
			//     value = highlightText(value, highlight_list)
			// }
			if (search) {
				value = addTextMark(value, search);
			}
			if (data.$group) {
				return type.treetable(data, type) + "<span style='font-weight:500; font-size: 110%'>" + value + "</span>";
			} else {
				return value
			}
		}

		function addTextMark(value, text) {
			const checkOccurence = new RegExp("(" + text + ")", "ig");
			return value.replace(
				checkOccurence,
				"<span class='search_mark'>$1</span>"
			);
		}

		function resizePagerToContent(pagerId) {
			const p = $$(pagerId);
			let width = 0;
			const nodes = p.$view.children;
			for (let node of nodes) {
				const w = node.offsetWidth + 4; // buttons + margin
				width += w;
			}
			width += 4 * 4 // back and first last buttons have extra margins
			p.define({ width });
			p.resize();
		}

		return {
			view: "treetable",
			id: "log_table",
			scroll: "y",
			columns: [
				{ id: "priority", header: [""], width: 30, template: levelToIcons, cssFormat: center },
				{
					id: "message", header: [{
						content: "textFilter",
						compare: messageFilter
					}], fillspace: true, css: { "word-break": "break-word" }, template: searchColumnTemplate
				},
				{
					id: "devicereportedtime", header: [{
						content: "dateRangeFilter",
						compare: filterByDate,
						inputConfig: {
							format: webix.Date.dateToStr("%m/%d")
						}
					}],
					format: webix.Date.dateToStr("%Y-%m-%d %H:%i:%s"), width: 174, cssFormat: center,
					template: function (obj) {
						if (!obj.$group) {
							var time = (obj.devicereportedtime).slice(0, -1) + '+09:00'
							time = new Date(time)
							var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
							return format(time)
						} else {
							return ""
						}
					}
				},
			],
			pager: "log_table_pager",
			fixedRowHeight: false, rowLineHeight: 27, rowHeight: 27, minRowHeight: 27,
			css: "webix_data_border webix_header_border",
			on: {
				// function to center a pager
				"data->onStoreUpdated": function () {
					webix.delay(() => {
						const id = this.config.pager.id;
						resizePagerToContent(id)
					})
				},
				onAfterLoad: function () {
					// set options of process multicombo
					var log_table = $$("log_table").serialize().map(function (value, index) { return value.syslogtag; });
					var systems = [... new Set(log_table)].sort()
					var element = $$("syslog_process_list").getPopup().getList()
					element.clearAll()
					element.parse(systems)

				},
				onBeforeFilter: function (id, value, config) {
					if (id === "message") searchResult = value
					if (id === "devicereportedtime") {
						if (firstDateFilterSkip) {
							if (dateFilterValue != this.getFilter("devicereportedtime").getValue()) {
								dateFilterValue = this.getFilter("devicereportedtime").getValue()

								var start = dateFilterValue.start
								var end = dateFilterValue.end

								if (start && end) {
									searchResult = ""
									this.getFilter("message").value = ""
									$$("syslog_process_list").setValue("")
									$$("syslog_level_list").setValue("")

									var sidebarMenu = $$("syslog_server_list")
									var sideBarValue = sidebarMenu.getSelectedId()

									var start_temp = new Date(start)
									var end_temp = new Date(end)
									// to avoid timezone issues
									start_temp.setHours(9, 0, 0, 0)
									end_temp.setHours(9, 0, 0, 0)

									var start_date = start_temp.toISOString().slice(0, 10)
									var end_date = end_temp.toISOString().slice(0, 10)

									var log_table = this
									log_table.showProgress()

									if (sideBarValue == "all") {
										webix.ajax().get("/api/syslog/list?start_date=" + start_date + "&end_date=" + end_date).then((data) => {
											log_table.clearAll()

											var log_table_data = data.json()
											log_table.parse(log_table_data)

											log_table.group({
												by: "syslogtag",
												map: {
													value: ["syslogtag"],
													message: ["syslogtag"]
												}
											})

											log_table.openAll()
											log_table.hideProgress()
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									} else {
										webix.ajax().get("/api/syslog/list/" + sideBarValue + "?start_date=" + start_date + "&end_date=" + end_date).then((data) => {
											log_table.clearAll()

											var log_table_data = data.json()
											log_table.parse(log_table_data)

											log_table.group({
												by: "syslogtag",
												map: {
													value: ["syslogtag"],
													message: ["syslogtag"]
												}
											})

											log_table.openAll()
											log_table.hideProgress()
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									}
								}
							}
						} else {
							dateFilterValue = this.getFilter("devicereportedtime").getValue()

							firstDateFilterSkip = true
						}
					}
				},
			}
		}
	}
	init(view) {
		webix.extend(view, webix.ProgressBar);
	}
	ready(view) {
		// multicombo process filter
		view.registerFilter(
			$$("syslog_process_list"),
			{
				columnId: "syslogtag",
				compare: function (cellValue, filterValue, obj) {
					var result = true
					if (filterValue.length > 0) {
						result = filterValue.includes(obj.syslogtag)
					}
					return result
				}
			},
			{
				getValue: function (list) {
					return list.getValue()
				}
			}
		)

		// multicombo level filter
		view.registerFilter(
			$$("syslog_level_list"),
			{
				columnId: "priority",
				compare: function (cellValue, filterValue, obj) {
					var result = true
					if (filterValue.length > 0) {
						result = filterValue.includes((obj.priority + 1) + "")
					}
					return result
				}
			},
			{
				getValue: function (list) {
					return list.getValue()
				}
			}
		)
	}
}