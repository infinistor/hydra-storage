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
import SnapshotsTab from "./pool management/pool tabs/snapshotsTab";
import { getTimeInterval, setTimeInterval } from "../../functions/timeIntervalForPoolManagement";

export default class SnapshotManagementView extends JetView {
	config() {
		return {
			gravity: 4,
			css: "allowOverflow",
			id: "snapshotManagementView",
			rows: [
				{
					view: "toolbar",
					height: 35,
					css: "dashboard-toolbar",
					borderless: true,
					elements: [
						{
							type: "header", borderless: true, template: "<span style='font-weight: 100; margin-right: 5px'>Storage</span> <span style='font-weight: 100; margin-right: 5px'>></span> <span>Snapshot Management</span>",
						},
						{},
						{
							view: "richselect", id: "snapshotManagementTimeInterval", label: "Refresh every", labelWidth: 95, width: 165, options: [
								{ id: 3, value: "3s" },
								{ id: 5, value: "5s" },
								{ id: 10, value: "10s" },
								{ id: 15, value: "15s" },
								{ id: 20, value: "20s" },
							], on: {
								onChange: function (newValue, oldValue) {
									setTimeInterval(newValue)
								}
							}
						}
					]
				},
				SnapshotsTab
			],
		};
	}
	init() {
		this.resizeElement()

		$$("snapshotManagementTimeInterval").setValue(getTimeInterval() / 1000)
	}
	ready() {
		var resize = this.resizeElement
		webix.event(window, "resize", function () {
			resize()
		})
	}
	resizeElement() {
		const snapshotManagementView = $$("snapshotManagementView")

		if (snapshotManagementView) {
			const topBar = 48
			var notificationWindowDatatable = 0
			var notificationBar = 0
			var html = document.documentElement;

			var height = html.offsetHeight

			if ($$("notificationWindow").config) {
				if (height - $$("notificationWindow").config.top > 45) {
					notificationWindowDatatable = 282
					notificationBar = 34
				}
			}
			snapshotManagementView.config.height = height - (topBar + notificationWindowDatatable + notificationBar)
			snapshotManagementView.resize()
		}

	}
}