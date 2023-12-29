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
export function netmaskConverter(netmask) {
    if (typeof netmask === 'string' && /^\d+$/.test(netmask) || typeof netmask === 'number') {
        // Assume CIDR notation as a string
        var cidr = parseInt(netmask, 10);
        var mask = '';
        for (var i = 0; i < 4; i++) {
            var octet = Math.min(32, Math.max(0, cidr - i * 8));
            mask += (i > 0 ? '.' : '') + (0xff ^ (0xff >> octet) & 0xff);
        }
        return mask;
    } else if (typeof netmask === 'string') {
        // Assume dotted-decimal notation
        var parts = netmask.split('.');
        if (parts.length !== 4) {
            return "N/A"
        }
        var cidr = 0;
        for (var i = 0; i < 4; i++) {
            var octet = parseInt(parts[i]);
            if (isNaN(octet) || octet < 0 || octet > 255) {
            throw new Error('Invalid octet value in netmask');
            }
            cidr += Math.log2(0xff ^ (octet & 0xff));
        }
        return Math.round(cidr);
    } else {
        return "N/A"
    }
}