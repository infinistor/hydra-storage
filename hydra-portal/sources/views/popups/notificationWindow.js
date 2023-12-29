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

import { levelToIcons, centerIcon } from "../../functions/levelToIconTemplate";

var windowOpen = false
const datatableHeight = 282
const topBar = 48
const notificationBar = 34
export default class NotificationWindow extends JetView {
	config() {
		return {
			view: "window",
			id: "notificationWindow",
			move: false,
			head: {
				view: "toolbar",
				cols: [
					{
						view: "label", label: '<span class="webix_icon_btn mdi mdi-bullhorn" style="min-width:35px;"></span>Notifications', css: "header_label", click: () => {
							this.resizeWindow(datatableHeight, topBar, notificationBar)
						}
					},
					{
						view: "richselect", id: "notificationRowNumber", value: 10, inputWidth: 60, width: 60, options: [
							{ id: 10, value: "10" },
							{ id: 20, value: "20" },
							{ id: 30, value: "30" },
							{ id: 40, value: "40" },
							{ id: 50, value: "50" },
						], on: {
							onChange: (newValue, oldValue) => {
								$$("notificationDatatable").clearAll()
								$$("notificationDatatable").load("/api/notifications?limit=" + newValue)
							}
						}
					},
				]
			},
			body: {
				view: "datatable",
				id: "notificationDatatable",
				borderless: true,
				// header: false,
				height: 282,
				scroll: "y",
				headerRowHeight: 25,
				fixedRowHeight: false, rowLineHeight: 27, rowHeight: 27, minRowHeight: 27,
				columns: [
					{ id: "priority", header: "Severity", adjust: "header", template: levelToIcons, },
					{ id: "message", header: "Description", fillspace: true },
					{
						id: "devicereportedtime", header: "Date and Time", width: 150,
						template: function (obj) {
							var time = (obj.devicereportedtime).slice(0, -1) + '+09:00'
							time = new Date(time)
							var format = webix.Date.dateToStr("%Y-%m-%d %H:%i:%s")
							return format(time)
						}
					},
				],
				url: "/api/notifications?limit=10",
				on: {
					onAfterLoad: function () {
						this.hideProgress()
					}
				}
			},
			position: function (state) {
				state.top = state.maxHeight
				state.left = 0
				state.width = state.maxWidth
			}
		}
	}
	init() {
		var view = this.getRoot().queryView({ view: "datatable" })
		webix.extend(view, webix.ProgressBar);
		view.showProgress()
	}
	showWindow() {
		this.getRoot().show()
	}
	ready() {
		var resize = this.resizeWindow
		webix.event(window, "resize", function () {
			if (windowOpen) {
				resize()
			} else {
				windowOpen = false
			}
		})
	}
	resizeWindow() {
		// if window is open, reload the datatable
		if (!windowOpen) {
			$$("notificationDatatable").clearAll()
			$$("notificationDatatable").load("/api/notifications")
		}

		var html = document.documentElement;
		var height = html.offsetHeight;

		var dashboardView = $$("dashboardView")

		var poolManagementView = $$("poolManagementView")

		var smbView = $$("smbView")
		var nfsView = $$("nfsView")
		var s3View = $$("s3View")

		var systemView = $$("systemView")
		var networkView = $$("networkView")

		var usersView = $$("usersView")
		var groupsView = $$("groupsView")
		var chapUsersView = $$("chapUsersView")

		var logsWindow = $$("logsView")
		var hydraLogsView = $$("hydraLogsView")

		var window = $$("notificationWindow")

		// hide menu notification bell button if window is open
		if (windowOpen) {
			$$("menuNotificationButton").show()
			$$("menuSpacer").show()
		} else {
			$$("menuNotificationButton").hide()
			$$("menuSpacer").hide()
		}

		if (!windowOpen) {
			if (dashboardView) {
				dashboardView.config.height = height - (datatableHeight + topBar + notificationBar)
				dashboardView.resize()
			}

			if (poolManagementView) {
				poolManagementView.config.height = height - (datatableHeight + topBar + notificationBar)
				poolManagementView.resize()
			}

			if (smbView) {
				smbView.config.height = height - (datatableHeight + topBar + notificationBar)
				smbView.resize()
			}

			if (nfsView) {
				nfsView.config.height = height - (datatableHeight + topBar + notificationBar)
				nfsView.resize()
			}

			if (s3View) {
				s3View.config.height = height - (datatableHeight + topBar + notificationBar)
				s3View.resize()
			}

			if (systemView) {
				systemView.config.height = height - (datatableHeight + topBar + notificationBar)
				systemView.resize()
			}

			if (networkView) {
				networkView.config.height = height - (datatableHeight + topBar + notificationBar)
				networkView.resize()
			}

			if (usersView) {
				usersView.config.height = height - (datatableHeight + topBar + notificationBar)
				usersView.resize()
			}

			if (groupsView) {
				groupsView.config.height = height - (datatableHeight + topBar + notificationBar)
				groupsView.resize()
			}

			if (chapUsersView) {
				chapUsersView.config.height = height - (datatableHeight + topBar + notificationBar)
				chapUsersView.resize()
			}

			if (logsWindow) {
				logsWindow.config.height = height - (datatableHeight + topBar + notificationBar)
				logsWindow.resize()
			}

			if (hydraLogsView) {
				hydraLogsView.config.height = height - (datatableHeight + topBar + notificationBar)
				hydraLogsView.resize()
			}

			windowOpen = true
			var top = window.$view.offsetTop;
			var left = window.$view.offsetLeft;
			window.setPosition(left, top - (datatableHeight + notificationBar))
		} else {
			if (dashboardView) {
				dashboardView.config.height = height - (topBar)
				dashboardView.resize()
			}

			if (poolManagementView) {
				poolManagementView.config.height = height - (topBar)
				poolManagementView.resize()
			}

			if (smbView) {
				smbView.config.height = height - (topBar)
				smbView.resize()
			}

			if (nfsView) {
				nfsView.config.height = height - (topBar)
				nfsView.resize()
			}

			if (s3View) {
				s3View.config.height = height - (topBar)
				s3View.resize()
			}

			if (systemView) {
				systemView.config.height = height - (topBar)
				systemView.resize()
			}

			if (networkView) {
				networkView.config.height = height - (topBar)
				networkView.resize()
			}

			if (usersView) {
				usersView.config.height = height - (topBar)
				usersView.resize()
			}

			if (groupsView) {
				groupsView.config.height = height - (topBar)
				groupsView.resize()
			}

			if (chapUsersView) {
				chapUsersView.config.height = height - (topBar)
				chapUsersView.resize()
			}

			if (logsWindow) {
				logsWindow.config.height = height - (topBar)
				logsWindow.resize()
			}

			if (hydraLogsView) {
				hydraLogsView.config.height = height - (topBar)
				hydraLogsView.resize()
			}

			windowOpen = false
			var top = window.$view.offsetTop;
			var left = window.$view.offsetLeft;
			window.setPosition(left, top + datatableHeight + notificationBar)
		}
	}
}