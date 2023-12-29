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
export function ipAddressStringValidator(value) {
    if(value == "") return true

    if (value.length > 255) return false

    var ip_list = value.split(" ")

    for (var i = 0; i < ip_list.length; i++) {
        var ip = ip_list[i]

        if (ip == "") continue
    
        // if the string contains only alphanumeric or numeric characters, return false
        if (/^[a-zA-Z0-9]+$/.test(ip) || /^[0-9]+$/.test(ip)) {
            if(ip != "localhost") return false;
        }
    
        // check if the format matches any of the following:
        // - Single host: 192.168.1.100 or pspace.local
        // - Network segment: 192.168.1.32/24 or 192.168.1.32/255.255.255.0
        // - Wildcard: * or *.pspace.com or 192.168.1.*
        const singleHostPattern = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$|^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
        const networkSegmentPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/(\d|[1-2]\d|3[0-2])|\/(((\d{1,3}\.){3}\d{1,3})|(0x|0X)?([0-9a-fA-F]{2}\.){3}(0x|0X)?[0-9a-fA-F]{2}))$/;
        const wildcardPattern = /^(\*\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])|\d{1,3}\.\d{1,3}\.\d{1,3}\.\*|\*)$/;
    
        if (!singleHostPattern.test(ip) && !networkSegmentPattern.test(ip) && !wildcardPattern.test(ip)) {
            return false
        }
    }
    return true
}

export function ipAddressValidator(value) {
    // return false if empty or more than 255 characters
    if (value === "" || value.length > 255) {
        return false;
    }

    // if the string contains only alphanumeric or numeric characters, return false
    if (/^[a-zA-Z0-9]+$/.test(value) || /^[0-9]+$/.test(value)) {
        if(value == "localhost") return true
        return false;
    }

    // check if the format matches any of the following:
    // - Single host: 192.168.1.100 or pspace.local
    // - Network segment: 192.168.1.32/24 or 192.168.1.32/255.255.255.0
    // - Wildcard: * or *.pspace.com or 192.168.1.*
    const singleHostPattern = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$|^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
    const networkSegmentPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(\/(\d|[1-2]\d|3[0-2])|\/(((\d{1,3}\.){3}\d{1,3})|(0x|0X)?([0-9a-fA-F]{2}\.){3}(0x|0X)?[0-9a-fA-F]{2}))$/;
    const wildcardPattern = /^(\*\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])|\d{1,3}\.\d{1,3}\.\d{1,3}\.\*|\*)$/;

    return singleHostPattern.test(value) || networkSegmentPattern.test(value) || wildcardPattern.test(value);
}