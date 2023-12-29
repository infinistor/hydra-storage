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
import { ajaxFail } from "../../../../functions/ajaxFail";

export default class ScrubContextMenu extends JetView {
	config() {
		return {
			view: "contextmenu",
			autowidth: true,
			id: "scrub_context_menu",
			data: ["Stop", "Delete"],
			on: {
				onItemClick: (id) => {
					var pool_id = this.getParam("pool_id", true)
					var scrub = this.getParam("scrub", true)
					var scrub_id = scrub.id
					switch (id) {
						case "Delete":
							webix.confirm({
								title: "Delete record",
								text: "Are you sure you want to delete the record of this scrub?",
								ok: "Yes", cancel: "Cancel",
								width: 300,
								callback: function (result) {
									if (result) {
										webix.ajax().del("/api/storage/scrubs/" + scrub_id).then(function (data) {
											webix.message({ type: "success", text: data.json(), expire: 2000 })
											$$("poolManagementTabScrubDatatable").clearAll()
											$$("poolManagementTabScrubDatatable").load("/api/storage/pools/" + pool_id + "/scrub-history")
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									}
								}
							})
							break;
						case "Stop":
							webix.confirm({
								type: "confirm-warning",
								title: "Stop scrub",
								text: "Are you sure you want to stop this scrub?",
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
							break;
					}
				},
				onBeforeShow: () => {
					var scrub = this.getParam("scrub", true)
					var scrub_status = scrub.status
					if (scrub_status != "In Progress") {
						$$("scrub_context_menu").hideMenuItem("Stop")
					}
				}
			}
		}
	}
}