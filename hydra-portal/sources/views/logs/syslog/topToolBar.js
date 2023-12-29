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

export default class TopToolBar extends JetView {
	config() {
		return {
			view: "toolbar",
			borderless: true,
			elements: [
				{
					padding: 0,
					cols: [
						{
							view: "icon",
							width: 41,
							icon: "mdi mdi-server",
							click: () => {
								$$("syslog_server_list").toggle()
								var collapsed = $$("syslog_server_list").getState().collapsed
								if (collapsed) {
									$$("syslog_header_label").hide()
								} else {
									$$("syslog_header_label").show()
								}
							}
						},
						{
							view: "label", id: "syslog_header_label", label: "Servers", css: "header_label", width: 105,
						},
					]
				},
				{},
				{
					view: "multiselect",
					id: "syslog_process_list",
					label: "Process",
					placeholder: "All",
					labelWidth: 70,
					minWidth: 150,
					maxWidth: 300,
					stringResult: false,
					options: [],
					suggest: {
						selectAll: true,
					},
					on: {
						onChange: function () {
							$$("log_table").filterByAll()
						}
					}
				},
				{
					view: "multiselect",
					id: "syslog_level_list",
					label: "Level",
					placeholder: "All",
					labelWidth: 50,
					minWidth: 150,
					maxWidth: 300,
					options: [
						{ id: 1, value: "Emergency" },
						{ id: 2, value: "Alert" },
						{ id: 3, value: "Critical" },
						{ id: 4, value: "Error" },
						{ id: 5, value: "Warning" },
						{ id: 6, value: "Notice" },
						{ id: 7, value: "Info" },
						{ id: 8, value: "Debug" },
					],
					on: {
						onChange: function () {
							$$("log_table").filterByAll()
						}
					}
				},
				{
					width: 5
				}
			],
		}
	}
}