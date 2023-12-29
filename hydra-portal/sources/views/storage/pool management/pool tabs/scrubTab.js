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
import CreateScrubScheduleWindow from "../windows/createScrubSchedule";
import ScrubContextMenu from "../context menus/scrubContextMenu";

import { searchColumnTemplate } from "../../../../functions/searchTemplate";
import { ajaxFail } from "../../../../functions/ajaxFail";

var createScrubWindow
export default class ScrubTab extends JetView {
	config() {
		var baseView = this

		return {
			borderless: true,
			rows: [
				{
					view: "toolbar", borderless: true, elements: [
						{
							view: "icon", icon: "mdi mdi-play", css: "icon-button",
							click: () => {
								var pool_id = baseView.getParam("pool_id", true)
								webix.ajax().post("/api/storage/pools/" + pool_id + "/scrub-now").then(function (data) {
									webix.message({
										type: "success",
										text: data.json(),
										expire: 2000
									})
								}).fail((xhr) => {
									ajaxFail(xhr)
								})
							}
						},
						{
							view: "icon", icon: "mdi mdi-stop", css: "icon-button", click: () => {
								var pool_id = baseView.getParam("pool_id", true)
								webix.confirm({
									type: "confirm-warning",
									title: "Stop scrub",
									text: "Are you sure you want to stop the running scrub?",
									ok: "Yes", cancel: "Cancel",
									width: 350,
									callback: function (result) {
										if (result) {
											webix.ajax().del("/api/storage/pools/" + pool_id + "/scrub").then(function (data) {
												webix.message({
													type: "success",
													text: data.json(),
													expire: 2000
												})
											}).fail((xhr) => {
												ajaxFail(xhr)
											})
										}
									}
								})
							}
						},
						{
							view: "icon", icon: "mdi mdi-calendar-month", css: "icon-button", click: () => {
								createScrubWindow.showWindow()
							}
						},
						{
							width: 5
						},
						{
							view: "template",
							hidden: true,
							height: 20,
							width: 180,
							id: "poolManagementTabScrubLastRun",
							css: "scrubRunLabel",
						},
						{
							view: "template",
							hidden: true,
							id: "poolManagementTabScrubNextRun",
							height: 20,
							width: 180,
							css: "scrubRunLabel",
						},
						{},
					]
				},
				{
					view: "datatable",
					id: "poolManagementTabScrubDatatable",
					minRowHeight: 27,
					headerRowHeight: 24,
					borderless: true,
					autoheight: true,
					// scroll: "y",
					tooltip: function (obj) {
						if (!obj.log) return ""
						return obj.log
					},
					columns: [
						{
							id: "pool_name", header: "Pool Name", adjust: true,
						},
						{
							id: "status", header: "Status", adjust: true, template(obj) {
								if (!obj.status) {
									return ""
								}

								var style = `
                                padding: 1px 3px;
                                border-radius: 10px;
                                border: transparent solid 1.5px;
                                font-size: 80%;
                            `
								// if online, return green
								if (obj.status == "Finished") {
									return `<span style='color: #00c900; ${style} border-color: #00c900'>${obj.status}</span>`
								} else if (obj.status == "Canceled") {
									return `<span style='color: #ff0000; ${style} border-color: #ff0000'>${obj.status}</span>`
								} else if (obj.status == "In Progress") {
									return `<span style='color: #1ca1c1; ${style} border-color: #1ca1c1'>${obj.status}</span>`
								} else {
									return `<span style='color: #bfbfbf; ${style} border-color: #bfbfbf'>${obj.status}</span>`
								}
							}
						},
						{
							id: "total", header: "Target Total", adjust: true, template: function (obj) {
								if (!obj.total) return ""
								return obj.total.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{
							id: "completion_percent", header: "Progress", adjust: true, template: function (obj) {
								if (obj.status == "Finished") {
									return "100%"
								} else {
									if (!obj.completion_percent) return ""
									return obj.completion_percent
								}
							}
						},
						{
							id: "repaired", header: "Repaired", adjust: true, template: function (obj) {
								if (!obj.repaired) return ""
								return obj.repaired.replace("T", "TiB").replace("G", "GiB").replace("M", "MiB").replace("K", "KiB")
							}
						},
						{ id: "errors", header: "Errors", adjust: true, },
						{
							id: "progress_time", header: "Finished In", adjust: true, template: function (obj) {
								if (obj.status == "Finished") {
									if (!obj.progress_time) return ""
									return obj.progress_time
								} else {
									return ""
								}
							}
						},
						{
							id: "start_time", header: "Start Time", adjust: true,
							format: webix.Date.dateToStr("%Y-%m-%d %H:%i:%s"),
							template: function (obj) {
								if (obj.start_time == "") {
									return ""
								}
								var time = (obj.start_time).slice(0, -1) + '+09:00'
								time = new Date(time)
								var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
								return format(time)
							}
						},
						{
							id: "end_time", header: "End Time", fillspace: true,
							format: webix.Date.dateToStr("%Y-%m-%d %H:%i:%s"),
							template: function (obj) {
								if (!obj.end_time) {
									return ""
								}
								var time = (obj.end_time).slice(0, -1) + '+09:00'
								time = new Date(time)
								var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
								return format(time)
							}
						},
						{
							id: "settings", header: "", adjust: "data",
							template: function () {
								return `<button type="button" class="hoverButton webix_icon_button">
                                        <span class="webix_icon mdi mdi-wrench"></span>
                                    </button>`
							}
						},
					],
					onClick: {
						hoverButton: (e, id, target) => {
							var item = $$("poolManagementTabScrubDatatable").getItem(id.row)
							baseView.setParam("scrub", { id: item.id, status: item.status }, false)

							$$("scrub_context_menu").show(target)
						}
					},
					on: {
						onAfterLoad: function () {
							if (this.count() == 0) {
								this.hide()
								$$("poolManagementTabNoScrubHistoryLabel").show()
							} else {
								this.show()
								$$("poolManagementTabNoScrubHistoryLabel").hide()
							}
						},
						onAfterDelete: function () {
							if (this.count() == 0) {
								this.hide()
								$$("poolManagementTabNoScrubHistoryLabel").show()
							} else {
								this.show()
								$$("poolManagementTabNoScrubHistoryLabel").hide()
							}
						}
					}
				},
				{
					view: "label", id: "poolManagementTabNoScrubHistoryLabel", label: "No scrub history found", align: "center", hidden: true
				},
				{}
			]
		}
	}
	init() {
		this.ui(ScrubContextMenu)
		createScrubWindow = this.ui(CreateScrubScheduleWindow)
	}
}