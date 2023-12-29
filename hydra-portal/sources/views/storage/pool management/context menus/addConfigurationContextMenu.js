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
import AddDiskGroupWindow from "../windows/addDiskGroup"
import AddLogWindow from "../windows/addLog";
import AddCacheWindow from "../windows/addCache";
import AddSpareWindow from "../windows/addSpares";

export default class AddConfigurationContextMenu extends JetView {
	config() {
		var pool_id
		return {
			view: "contextmenu",
			id: "zfs_add_configuration_context_menu",
			autowidth: true,
			data: ["Add disk group", "Add journal device", "Add cache device", "Add spare device"],
			on: {
				onItemClick: (id) => {
					var item = $$("zfs_add_configuration_context_menu").getItem(id)
					switch (item.value) {
						case "Add disk group":
							$$("add_group_window").show()
							break
						case "Add device to disk group":
							break
						case "Add journal device":
							$$("add_log_window").show()
							break
						case "Add cache device":
							$$("add_cache_window").show()
							break
						case "Add spare device":
							$$("add_spare_window").show()
							break
					}
				},
				onBeforeShow: () => {
					pool_id = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/" + pool_id).then(function (data) {
						var poolInfo = data.json()

						$$("zfs_add_configuration_context_menu").clearAll()

						if (poolInfo.configuration == "mirror") {
							$$("zfs_add_configuration_context_menu").add({
								value: "Add disk group",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add device to mirror",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add journal device",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add cache device",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add spare device",
							})
						} else {
							$$("zfs_add_configuration_context_menu").add({
								value: "Add disk group",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add journal device",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add cache device",
							})
							$$("zfs_add_configuration_context_menu").add({
								value: "Add spare device",
							})
						}
					})
				}
			}
		}
	}
	init() {
		this.ui(AddDiskGroupWindow)
		this.ui(AddLogWindow)
		this.ui(AddCacheWindow)
		this.ui(AddSpareWindow)
	}
}