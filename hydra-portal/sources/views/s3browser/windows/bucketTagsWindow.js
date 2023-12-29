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
export default class BucketTagsWindow extends JetView {
	config() {
		var bucketName = ""

		return {
			view: "window",
			id: "bucket_tagging_window",
			position: "center",
			width: 700,
			move: true,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Edit Tags", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: () => {
							this.hideWindow()
						}
					}
				]
			},
			body: {
				padding: 10,
				rows: [
					{
						cols: [
							{
								view: "button", width: 40, css: "button-font-size-change", value: "+", css: "webix_primary", type: "form", click: function () {
									$$("tags_datatable").add({ Key: "", Value: "" })
									$$("tags_datatable").refresh()
								}
							},
							{
								width: 5
							},
							{
								view: "button", width: 40, value: "—", css: "webix_primary", type: "form", click: function () {
									if ($$("tags_datatable").count()) {
										$$("tags_datatable").remove($$("tags_datatable").getLastId())
										$$("tags_datatable").refresh()
									}

								}
							}
						]
					},
					{
						height: 5
					},
					{
						view: "datatable",
						id: "tags_datatable",
						scroll: "auto",
						width: 700,
						height: 500,
						editable: true,
						columns: [
							{ id: "Key", header: { text: "Key", css: { "text-align": "center" } }, fillspace: 1, editor: "text" },
							{ id: "Value", header: { text: "Value", css: { "text-align": "center" } }, fillspace: 1, editor: "text" },
						],
						data: [],
					},
					{
						height: 5
					},
					{
						cols: [
							{
								view: "button", width: 40, value: "Save", css: "webix_primary", autowidth: true, type: "form", click: function () {
									$$("tags_datatable").editStop()
									var tags = $$("tags_datatable").serialize()
									json = {
										bucket: bucketName,
										credentials: s3browser_credentials,
										tags: []
									}

									for (var i = 0; i < tags.length; i++) {
										if (tags[i].Key && tags[i].Value) {
											json.tags.push({
												Key: tags[i].Key,
												Value: tags[i].Value
											})
										} else continue
									}

									// put request
									webix.ajax().put("/api/s3browser/buckets/tagging", JSON.stringify(json)).then(function (data) {
										$$("tags_window").hide()
									})
								}
							},
							{}
						]
					},
					{
						height: 5
					}
				]
			},
			on: {
				onBeforeShow: () => {
					bucketName = this.getParam("bucketName", true)

					var json = {
						bucket: bucketName,
						credentials: s3browser_credentials
					}

					webix.ajax().get("/api/s3browser/buckets/tagging", JSON.stringify(json)).then(function (data) {
						var json = data.json()
						if (json.TagSet) {
							var tagSet = json.TagSet
							for (var i = 0; i < tagSet.length; i++) {
								$$("tags_datatable").add({
									Key: tagSet[i].Key,
									Value: tagSet[i].Value
								})
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
		$$("bucket_tagging_window").show()
	}
	hideWindow() {
		$$("bucket_tagging_window").hide()
	}
}