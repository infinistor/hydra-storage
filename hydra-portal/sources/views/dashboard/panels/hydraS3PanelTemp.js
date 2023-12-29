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

var timer
export default class HydraS3PanelTemp extends JetView {
	config() {
		return {
			view: "toolbar", 
			css: "dashboard-panel",
			elements: [
				{
					rows: [
						{},
						{
							view: "label", id: "TEMPpanelS3Status", align: "center", height: 46, on: {
								onItemClick: () => {
									// redirect to S3 page
									this.app.show("/top/s3");
								}
							}, css: {
								"cursor": "pointer"
							}
						},
						{
							view: "label", id: "TEMPpanelS3Uptime", align: "center", height: 30,
						},
						{
							height: 30, hidden: true, id: "TEMPpanelS3BucketsSpacer"
						},
						{
							height: 78,
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
		webix.ajax().get("/api/dashboard/hydras3").then(function(data){
			var info = data.json();

			let status = ""
			info.active ? status = "Online" : status = "Offline";
			let statusCss = ""
			info.active ? statusCss = "dashboard-panel-green" : statusCss = "";
			statusCss = "<span class='dashboard-panel-status-big " + statusCss + "'>" + status + "</span>";
			$$("TEMPpanelS3Status").setValue(statusCss);

			$$("TEMPpanelS3Uptime").setValue("<span class='dashboard-panel-gray-big'>" + info.uptime + "</span>");
			info.active ? $$("TEMPpanelS3Uptime").show() : $$("TEMPpanelS3Uptime").hide();
			!info.active ? $$("TEMPpanelS3BucketsSpacer").show() : $$("TEMPpanelS3BucketsSpacer").hide();
		})
	}
}