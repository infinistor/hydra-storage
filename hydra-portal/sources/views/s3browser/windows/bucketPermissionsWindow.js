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
export default class BucketPermissionsWindow extends JetView {
	config() {
		var bucketName = ""

		return {
			view: "window",
			id: "bucket_permissions_window",
			position: "center",
			move: true,
			width: 1000,
			move: true,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Edit Permissions", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: function () {
							$$("bucket_permissions_window").hide()
						}
					}
				]
			},
			on: {
				onShow: () => {
					bucketName = this.getParam("bucketName", true)

					var json = {
						bucket: bucketName,
						credentials: s3browser_credentials,
					}

					webix.ajax().put("/api/s3browser/buckets/acl", JSON.stringify(json)).then(function (data) {
						var json = data.json()

						var ownerId = json.Owner.ID //"1034"
						var grants = json.Grants
						var checkBoxId = ""
						for (var i = 0; i < grants.length; i++) {
							var permissionType = grants[i].Permission
							if (permissionType === "FULL_CONTROL") {
								var checkBoxId = "_full_control"
							} else if (permissionType === "READ") {
								var checkBoxId = "_read"
							} else if (permissionType === "WRITE") {
								var checkBoxId = "_write"
							} else if (permissionType === "READ_ACP") {
								var checkBoxId = "_read_permissions"
							} else if (permissionType === "WRITE_ACP") {
								var checkBoxId = "_write_permissions"
							}

							if (grants[i].Grantee.ID === ownerId) {
								checkBoxId = "owner" + checkBoxId
							} else {
								if (grants[i].Grantee.URI === "http://acs.amazonaws.com/groups/global/AuthenticatedUsers") {
									checkBoxId = "aws" + checkBoxId
								} else if (grants[i].Grantee.URI === "http://acs.amazonaws.com/groups/global/AllUsers") {
									checkBoxId = "all" + checkBoxId
								}
							}
							$$(checkBoxId).setValue(1)
						}
					})
				}
			},
			body: {
				paddingY: 10,
				paddingX: 10,
				rows: [
					{
						padding: 0,
						cols: [
							{
								view: "label", label: "Owner", labelWidth: 300,
							},
							{
								view: "checkbox",
								id: "owner_full_control",
								labelRight: "Full Control",
								value: 1,
								disabled: true,
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "owner_read",
								labelRight: "Read",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "owner_write",
								labelRight: "Write",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "owner_read_permissions",
								labelRight: "Read Permissions",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "owner_write_permissions",
								labelRight: "Write Permissions",
								labelWidth: 0,
							},
							{
								width: 10
							},
						]
					},
					{
						padding: 0,
						cols: [
							{
								view: "label", label: "Any AWS Users", labelWidth: 300,
							},
							{
								view: "checkbox",
								id: "aws_full_control",
								labelRight: "Full Control",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "aws_read",
								labelRight: "Read",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "aws_write",
								labelRight: "Write",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "aws_read_permissions",
								labelRight: "Read Permissions",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "aws_write_permissions",
								labelRight: "Write Permissions",
								labelWidth: 0,
							},
							{
								width: 10
							},
						]
					},
					{
						padding: 0,
						cols: [
							{
								view: "label", label: "All Users", labelWidth: 300,
							},
							{
								view: "checkbox",
								id: "all_full_control",
								labelRight: "Full Control",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "all_read",
								labelRight: "Read",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "all_write",
								labelRight: "Write",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "all_read_permissions",
								labelRight: "Read Permissions",
								labelWidth: 0,
							},
							{
								view: "checkbox",
								id: "all_write_permissions",
								labelRight: "Write Permissions",
								labelWidth: 0,
							},
							{
								width: 10
							},
						]
					},
					{
						padding: 0,
						cols: [
							{
								view: "button", css: "webix_primary", label: "Apply", width: 70,
								click: function () {
									var json = {
										bucket: bucketName,
										credentials: s3browser_credentials,
										permissions: []
									}

									var permission = {}

									// check values of all check boxes => add them to permissions json

									if ($$("owner_full_control").getValue() === 1) {
										permission = {
											permission: "FULL_CONTROL",
											userType: "Owner"
										}
										json.permissions.push(permission)
									}
									if ($$("owner_read").getValue() === 1) {
										permission = {
											permission: "READ",
											userType: "Owner"
										}
										json.permissions.push(permission)
									}
									if ($$("owner_write").getValue() === 1) {
										permission = {
											permission: "WRITE",
											userType: "Owner"
										}
										json.permissions.push(permission)
									}
									if ($$("owner_read_permissions").getValue() === 1) {
										permission = {
											permission: "READ_ACP",
											userType: "Owner"
										}
										json.permissions.push(permission)
									}
									if ($$("owner_write_permissions").getValue() === 1) {
										permission = {
											permission: "WRITE_ACP",
											userType: "Owner"
										}
										json.permissions.push(permission)
									}

									if ($$("aws_full_control").getValue() === 1) {
										permission = {
											permission: "FULL_CONTROL",
											userType: "AuthenticatedUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("aws_read").getValue() === 1) {
										permission = {
											permission: "READ",
											userType: "AuthenticatedUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("aws_write").getValue() === 1) {
										permission = {
											permission: "WRITE",
											userType: "AuthenticatedUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("aws_read_permissions").getValue() === 1) {
										permission = {
											permission: "READ_ACP",
											userType: "AuthenticatedUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("aws_write_permissions").getValue() === 1) {
										permission = {
											permission: "WRITE_ACP",
											userType: "AuthenticatedUsers"
										}
										json.permissions.push(permission)
									}

									if ($$("all_full_control").getValue() === 1) {
										permission = {
											permission: "FULL_CONTROL",
											userType: "AllUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("all_read").getValue() === 1) {
										permission = {
											permission: "READ",
											userType: "AllUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("all_write").getValue() === 1) {
										permission = {
											permission: "WRITE",
											userType: "AllUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("all_read_permissions").getValue() === 1) {
										permission = {
											permission: "READ_ACP",
											userType: "AllUsers"
										}
										json.permissions.push(permission)
									}
									if ($$("all_write_permissions").getValue() === 1) {
										permission = {
											permission: "WRITE_ACP",
											userType: "AllUsers"
										}
										json.permissions.push(permission)
									}

									webix.ajax().post("/api/s3browser/buckets/acl", JSON.stringify(json)).then(function (data) {
										$$("bucket_permissions_window").hide()
									})
								}
							},
							{}
						]
					},
				]
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
	showWindow() {
		$$("bucket_permissions_window").show()
	}
	hideWindow() {
		$$("bucket_permissions_window").hide()
	}
}