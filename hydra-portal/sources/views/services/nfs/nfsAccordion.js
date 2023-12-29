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
import { ajaxFail } from "../../../functions/ajaxFail";

export default class NFSAccordion extends JetView {
	config() {
		const labelWidth = 300

		return {
			rows: [
				{
					view: "form",
					borderless: true,
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "switch", id: "nfs_service_enable_switch", label: "Enable NFS Service", labelWidth: labelWidth,
										},
										{
											view: "richselect", id: "nfs_service_protocol", label: "Maximum NFS Protocol", labelWidth: labelWidth, value: 2,
											options: ["NFSv3", "NFSv4", "NFSv4.1", "NFSv4.2"]
										},
										{
											view: "richselect", id: "nfs_service_thread_count", label: "NFS Thread Count", labelWidth: labelWidth, value: 3,
											options: ["8", "16", "32", "64", "128", "256"],
										},
										{ height: 10 },
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70, click: function () {
												var enable = $$("nfs_service_enable_switch").getValue() == 1 ? "y" : "n"
												var protocol = $$("nfs_service_protocol").getValue()
												var thread_count = $$("nfs_service_thread_count").getValue() * 1
												var data = { enable: enable, maximum_nfs_protocol: protocol, thread_count: thread_count }

												webix.ajax().put("/api/nfs/config", JSON.stringify(data)).then((data) => {
													// successful message
													webix.message({ type: "success", text: "NFS Configuration Updated", expire: 10000 })
												}).fail((xhr) => {
													ajaxFail(xhr)
												})
											}
										},
										{ height: 5 },
									]
								},
								{}
							]
						},
					]
				}
			]
		}
	}
	init() {
		webix.ajax().get("/api/nfs/config/service").then((data) => {
			var active = data.json()
			$$("nfs_service_enable_switch").setValue(active ? 1 : 0)
		})

		webix.ajax().get("/api/nfs/config").then((data) => {
			var config = data.json()

			$$("nfs_service_protocol").setValue(config.maximum_nfs_protocol)
			$$("nfs_service_thread_count").setValue(config.thread_count)
		})
	}
}