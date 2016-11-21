/*
 * IBM Confidential
 * OCO Source Materials
 * IBM Concerto - Blockchain Solution Framework
 * Copyright IBM Corp. 2016
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has
 * been deposited with the U.S. Copyright Office.
 */

'use strict';

const common = require('..');

const businessNetwork = common.BusinessNetwork;

describe('Module', () => {
    describe('#instances', function() {
        it('check can get instances', function() {
            businessNetwork.should.not.be.null;
        });
    });
});
