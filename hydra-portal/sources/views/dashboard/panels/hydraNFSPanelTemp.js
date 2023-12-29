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

import { getTimeInterval } from "../../../functions/timeIntervalForDashboard";
import { ajaxFail } from "../../../functions/ajaxFail";

var timer
export default class HydraNFSPanelTemp extends JetView {
	config() {
		return {
			view: "toolbar", 
			css: "dashboard-panel",
			elements: [
				{
					rows: [
						{},
						{
							view: "label", id: "TEMPpanelNfsStatus", align: "center", height: 46, on: {
								onItemClick: () => {
									this.webix.storage.local.put("source", "dashboard")
									// redirect to SMB page
									this.app.show("/top/nfs");
								}
							}, css: {
								"cursor": "pointer"
							}
						},
						{
							view: "label", id: "TEMPpanelNfsUptime", align: "center", height: 30,
						},
						{
							height: 30, hidden: true, id: "TEMPpanelNfsExportsSpacer"
						},
						{
							view: "label", id: "TEMPpanelNfsExports", align: "center", height: 84, on: {
								onItemClick: () => {
									// redirect to NFS page
									this.app.show("/top/nfs");
								}
							}, css: {
								"cursor": "pointer"
							}
						},
						{}
					]
				}
						
			]
		}
	}
	init() {
		var fetchData = this.fetchData;
		this.startPeriodicRequest(fetchData);
	}
	startPeriodicRequest(fetchData) {
		fetchData();
		
		timer = setTimeout(() => {
			this.startPeriodicRequest(fetchData);
		}, getTimeInterval());
	}
	destroy() {
		clearTimeout(timer);
	}
	fetchData() {
		// check if SMB is running
		// check if SMB is running
		webix.ajax().get("/api/dashboard/hydranfs").then(function(data){
			var info = data.json();

			let status = ""
			info.active ? status = "Online" : status = "Offline";
			let statusCss = ""
			info.active ? statusCss = "dashboard-panel-green" : statusCss = "";
			statusCss = "<span class='dashboard-panel-status-big " + statusCss + "'>" + status + "</span>";
			$$("TEMPpanelNfsStatus").setValue(statusCss);

			$$("TEMPpanelNfsUptime").setValue("<span class='dashboard-panel-gray-big'>" + info.uptime + "</span>");
			info.active ? $$("TEMPpanelNfsUptime").show() : $$("TEMPpanelNfsUptime").hide();
			!info.active ? $$("TEMPpanelNfsExportsSpacer").show() : $$("TEMPpanelNfsExportsSpacer").hide();
			$$("TEMPpanelNfsExports").setValue("<span class='dashboard-panel-shares-big'>Exports: " + info.enabled_exports_number + " / " + info.total_exports_number + "</span>");
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
}