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

export default class LeftMenu extends JetView {
	config() {
		return {
			view: "sidebar",
			id: "syslog_server_list",
			width: 150,
			data: [
				{ id: "all", value: "All", icon: "mdi mdi-server" },
			],
			on: {
				onAfterSelect: function (id) {
					var log_table = $$("log_table")
					var start_date, end_date

					var datePicker = log_table.getFilter("devicereportedtime")

					if (!datePicker.getValue().start || !datePicker.getValue().end) {
						// set datePicker start and end date to today
						datePicker.setValue({
							start: new Date(),
							end: new Date()
						})
					}

					$$("syslog_process_list").setValue("")
					$$("syslog_level_list").setValue("")
					log_table.getFilter("message").value = ""

					start_date = new Date(datePicker.getValue().start)
					end_date = new Date(datePicker.getValue().end)

					// to avoid timezone issues
					start_date.setHours(9, 0, 0, 0)
					end_date.setHours(9, 0, 0, 0)

					start_date = start_date.toISOString().slice(0, 10)
					end_date = end_date.toISOString().slice(0, 10)

					log_table.showProgress()
					// if all systems are selected
					if (id == "all") {
						webix.ajax().get("/api/syslog/list?start_date=" + start_date + "&end_date=" + end_date).then((data) => {
							log_table.clearAll()

							var log_table_data = data.json()
							log_table.parse(log_table_data)

							log_table.group({
								by: "syslogtag",
								map: {
									value: ["syslogtag"],
									message: ["syslogtag"]
								}
							})

							log_table.openAll()
							log_table.hideProgress()
						}).fail((xhr) => {
							ajaxFail(xhr)
						})
					} // if a particular system is selected 
					else {
						webix.ajax().get("/api/syslog/list/" + id + "?start_date=" + start_date + "&end_date=" + end_date).then((data) => {
							log_table.clearAll()

							var log_table_data = data.json()
							log_table.parse(log_table_data)

							log_table.group({
								by: "syslogtag",
								map: {
									value: ["syslogtag"],
									message: ["syslogtag"]
								}
							})

							log_table.openAll()
							log_table.hideProgress()
						}).fail((xhr) => {
							ajaxFail(xhr)
						})
					}
				}
			}
		}
	}
	init(view) {
		webix.ajax().get("/api/syslog/list/hosts").then((data) => {
			var dataResponse = data.json()
			for (var i = 0; i < dataResponse.length; i++) {
				var item = {
					id: dataResponse[i],
					value: dataResponse[i],
					icon: "mdi mdi-server-minus"
				}
				view.add(item)
			}
			view.select("all")
		}).fail((xhr) => {
			ajaxFail(xhr)
		})
	}
}