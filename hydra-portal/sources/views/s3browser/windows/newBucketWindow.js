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
import { isKeyValidLatinOrNumber } from "../../../functions/validation";
import { ajaxFail } from "../../../functions/ajaxFail";

var s3browser_credentials
export default class NewBucketWindow extends JetView {
	config() {
		return {
			view: "window",
			id: "bucket_window",
			position: "center",
			width: 300,
			move: true,
			head: {
				view: "toolbar",
				borderless: true,
				cols: [
					{ width: 4 },
					{ view: "label", label: "Add New Bucket", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: () => {
							this.hideWindow()
						}
					}
				]
			},
			body: {
				borderless: true,
				paddingY: 10,
				paddingX: 10,
				rows: [
					{
						view: "form",
						padding: {
							bottom: 10, top: 0, left: 0, right: 0
						},
						id: "bucket_name_field",
						borderless: true,
						elements: [
							{
								view: "text", label: "Name", name: "name", width: 250, labelWidth: 50, invalidMessage: "Bucket name is required", on: {
									onKeyPress: (code, e) => {
										return isKeyValidLatinOrNumber(code, e) || code == 45 || code == 95
									}
								}
							}
						],
						rules: {
							name: webix.rules.isNotEmpty
						}
					},
					{
						view: "button", value: "Create", width: 70, css: "webix_primary", click: () => {
							if ($$("bucket_name_field").validate()) {
								var json = {
									bucket: $$("bucket_name_field").getValues().name,
									credentials: s3browser_credentials
								}

								webix.ajax().post("/api/s3browser/buckets/", JSON.stringify(json)).then(() => {
									$$("bucket_list").clearAll()
									$$("bucket_list").load(function () {
										return webix.ajax().put("/api/s3browser/buckets", JSON.stringify(s3browser_credentials))
									})
								}).fail((xhr) => {
									ajaxFail(xhr)
								})

								this.hideWindow()
							}
						}
					},
				]
			},
			on: {
				onHide: () => {
					$$("bucket_name_field").clear()
					$$("bucket_name_field").clearValidation()
				}
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
	showWindow() {
		$$("bucket_window").show()
	}
	hideWindow() {
		$$("bucket_window").hide()
	}
}