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

export default class NFSPermissionContextMenu extends JetView {
	config() {
		var editPermission = this.editPermission
		var removePermission = this.removePermission
		return {
			view: "contextmenu",
			id: "nfs_permission_context_menu",
			autowidth: true,
			data: ["Edit", "Remove"],
			on: {
				onItemClick: (id) => {
					var permission_id = this.getParam("permission_id", true)
					var export_id = this.getParam("export_id", true)
					switch (id) {
						case "Edit":
							editPermission()
							break;
						case "Remove":
							removePermission(permission_id, export_id)
							break;
					}
				}
			}
		}
	}
	init() {
	}
	editPermission() {
		$$("edit_export_permission_window").show()
	}
	removePermission(permission_id, export_id) {
		webix.confirm({
			title: "Delete Permission",
			text: "Are you sure you want to delete this permission?",
			callback: function (result) {
				if (result) {
					webix.ajax().del("/api/nfs/exports/permissions/" + permission_id).then(function () {
						$$("exports_datatable").getSubView(export_id).getChildViews()[1].remove(permission_id)
						$$("exports_datatable").resizeSubView(export_id)
					}).fail((xhr) => {
						ajaxFail(xhr)
					})
				}
			}
		})
	}
}