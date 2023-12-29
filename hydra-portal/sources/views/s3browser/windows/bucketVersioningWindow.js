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

var s3browser_credentials
export default class BucketVersioningWindow extends JetView {
	config() {
		var bucketName = ""
		var status

		return {
			view: "window",
			id: "bucket_versioning_window",
			position: "center",
			move: true,
			width: 300,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Bucket Versioning Settings", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: function () {
							$$("bucket_versioning_window").hide()
						}
					}
				]
			},
			body: {
				paddingY: 10,
				paddingX: 10,
				rows: [
					{
						view: "richselect", id: "versioning_status", label: "Status", labelWidth: 80, options: [
							{ id: 1, value: "Enabled" },
							{ id: 2, value: "Suspended" },
							{ id: 3, value: "No versioning" }
						], on: {
							onChange: function (newId, oldId) {
								if (this.getList().getItem(newId).disabled) {
									// prevents re-calling onChange from itself
									this.blockEvent();
									oldId ? this.setValue(oldId) : this.setValue("");
									this.unblockEvent();
								}
							}
						}
					},
					{
						padding: {
							top: 10, bottom: 0, left: 0, right: 0
						},
						cols: [
							{
								view: "button", width: 40, value: "Apply", css: "webix_primary", autowidth: true, type: "form", click: function () {
									// close window if no changes or no versioning
									if (status == $$("versioning_status").getText() || $$("versioning_status").getText() == "No versioning") {
										$$("bucket_versioning_window").hide()
										return
									}

									var json = {
										bucket: bucketName,
										credentials: s3browser_credentials,
										status: $$("versioning_status").getText()
									}

									webix.ajax().post("/api/s3browser/buckets/versioning", JSON.stringify(json)).then(function (data) {
										$$("bucket_versioning_window").hide()
									})
								}
							},
							{}
						]
					},
				]
			},
			on: {
				onBeforeShow: () => {
					bucketName = this.getParam("bucketName", true)

					var json = {
						bucket: bucketName,
						credentials: s3browser_credentials
					}

					webix.ajax().put("/api/s3browser/buckets/versioning", JSON.stringify(json)).then(function (data) {
						status = data.json().Status

						// no versioning
						if (!status) {
							// enable "no versioning" option in richselect
							$$("versioning_status").getList().getItem(3).disabled = false
							$$("versioning_status").getList().removeCss(3, "disabled");

							// set value to "no versioning"
							$$("versioning_status").setValue(3)

							// disable "suspended" option in richselect
							$$("versioning_status").getList().getItem(2).disabled = true
							$$("versioning_status").getList().addCss(2, "disabled");
						}

						if (status) {
							// disable "no versioning" option in richselect
							$$("versioning_status").getList().getItem(3).disabled = true
							$$("versioning_status").getList().addCss(3, "disabled");

							// enable "suspended" option in richselect
							$$("versioning_status").getList().getItem(2).disabled = false
							$$("versioning_status").getList().removeCss(2, "disabled");
							if (status == "Enabled") {
								// set value to "enabled"
								$$("versioning_status").setValue(1)
							} else {
								// set value to "suspended"
								$$("versioning_status").setValue(2)
							}
						}
					})
				}
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
	showWindow() {
		$$("bucket_versioning_window").show()
	}
	hideWindow() {
		$$("bucket_versioning_window").hide()
	}
}