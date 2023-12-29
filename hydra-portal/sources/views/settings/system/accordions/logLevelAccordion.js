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

export default class LogLevelAccordion extends JetView {
	config() {
		const labelWidth = 300

		return {
			borderless: true,
			rows: [
				{
					view: "form",
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "richselect", id: "logLevelList", label: "Log Configuration", labelWidth: labelWidth, options: [
												{ id: 8, value: "Debug" },
												{ id: 7, value: "Info" },
												{ id: 6, value: "Notice" },
												{ id: 5, value: "Warning" },
												{ id: 4, value: "Error" },
												{ id: 3, value: "Critical" },
												{ id: 2, value: "Alert" },
												{ id: 1, value: "Emergency" },
											], on: {
												onAfterRender: () => {
													webix.ajax().get("/api/system/log-configuration").then(function (data) {
														$$("logLevelList").setValue(data.json().log_level + 1)
													})
												}
											}
										},
										{ height: 10 },
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
												// log level value to int
												var json_log = {
													"log_level": $$("logLevelList").getValue() - 1
												}

												webix.ajax().put("/api/system/log-configuration", JSON.stringify(json_log)).then(function (data) {
													webix.message({ type: "success", text: "Log level updated", expire: 10000 })
												}).fail((xhr) => {
													ajaxFail(xhr)
												})
											}
										}
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
}