/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const boot = require('loopback-boot');
const { IdCard, Wallet } = require('composer-common');
const loopback = require('loopback');
require('loopback-component-passport');
const LoopBackCardStore = require('../../lib/loopbackcardstore');
const path = require('path');

const chai = require('chai');
const should = chai.should();
chai.use(require('chai-as-promised'));

describe('LoopBackCardStore', () => {

    let app;
    let Card, cardStore;

    beforeEach(async () => {
        app = loopback();
        await new Promise((resolve, reject) => {
            boot(app, path.resolve(__dirname, '..', '..', 'server'), (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
        Card = app.models.Card;
        const dataSource = loopback.createDataSource({
            connector: loopback.Memory
        });
        app.models.user.attachTo(dataSource);
        Card.attachTo(dataSource);
        const user = await app.models.user.create({ email: 'alice@email.com', password: 'password' });
        const idCard1 = new IdCard({ userName: 'alice1', enrollmentSecret: 'aliceSecret', businessNetwork: 'bond-network' }, { name: 'defaultProfile', 'x-type': 'embedded' });
        const idCard1Data = await idCard1.toArchive({ type: 'nodebuffer' });
        await Card.create({ userId: user.id, name: 'alice1@bond-network', base64: idCard1Data.toString('base64'), data: { test1: 'hello this is a cert', test2: 'nay' } });
        const idCard2 = new IdCard({ userName: 'bob1', enrollmentSecret: 'bobSecret', businessNetwork: 'bond-network' }, { name: 'defaultProfile', 'x-type': 'embedded' });
        const idCard2Data = await idCard2.toArchive({ type: 'nodebuffer' });
        await Card.create({ userId: user.id, name: 'bob1@bond-network', base64: idCard2Data.toString('base64'), data: { test1: 'hello this is a cert', test2: 'nay' } });
        cardStore = new LoopBackCardStore(Card);
    });

    describe('#get', () => {

        it('should return the specified business network card', async () => {
            const card = await cardStore.get('alice1@bond-network');
            card.should.be.an.instanceOf(IdCard);
            card.getUserName().should.equal('alice1');
            card.getEnrollmentCredentials().secret.should.equal('aliceSecret');
            card.getBusinessNetworkName().should.equal('bond-network');
            card.getConnectionProfile().name.should.equal('defaultProfile');
        });

        it('should throw an error if the specified business network card does not exist', async () => {
            await cardStore.get('charlie1@bond-network')
                .should.be.rejectedWith(/The business network card.*does not exist/);
        });

    });

    describe('#put', () => {

        it('should put the specified business network card', async () => {
            const idCard = new IdCard({ userName: 'charlie1', enrollmentSecret: 'charlieSecret', businessNetwork: 'bond-network' }, { name: 'defaultProfile', 'x-type': 'embedded' });
            await cardStore.put('charlie1@bond-network', idCard);
            const card = await Card.findOne({ where: { name: 'charlie1@bond-network' }});
            card.name.should.equal('charlie1@bond-network');
        });

        it('should replace the specified business network card without merging any data', async () => {
            const idCard = new IdCard({ userName: 'charlie1', enrollmentSecret: 'charlieSecret', businessNetwork: 'bond-network' }, { name: 'defaultProfile', 'x-type': 'embedded' });
            await cardStore.put('charlie1@bond-network', idCard);
            let count = await Card.count({ name: 'charlie1@bond-network' });
            count.should.equal(1);
            await cardStore.put('charlie1@bond-network', idCard);
            count = await Card.count({ name: 'charlie1@bond-network' });
            count.should.equal(1);
        });

        it('should replace the specified business network card and merge any data', async () => {
            const idCard = new IdCard({ userName: 'charlie1', enrollmentSecret: 'charlieSecret', businessNetwork: 'bond-network' }, { name: 'defaultProfile', 'x-type': 'embedded' });
            await cardStore.put('charlie1@bond-network', idCard);
            let card = await Card.findOne({ where: { name: 'charlie1@bond-network' }});
            card.data.should.deep.equal({});
            card.data = { key1: 'value1', key2: 'value2' };
            await card.save();
            await cardStore.put('charlie1@bond-network', idCard);
            card = await Card.findOne({ where: { name: 'charlie1@bond-network' }});
            card.data.should.deep.equal({ key1: 'value1', key2: 'value2' });
        });

    });

    describe('#getAll', () => {

        it('should return all business network cards', async () => {
            const cards = await cardStore.getAll();
            cards.should.be.an.instanceOf(Map);
            const aliceCard = cards.get('alice1@bond-network');
            aliceCard.should.be.an.instanceOf(IdCard);
            aliceCard.getUserName().should.equal('alice1');
            aliceCard.getEnrollmentCredentials().secret.should.equal('aliceSecret');
            aliceCard.getBusinessNetworkName().should.equal('bond-network');
            aliceCard.getConnectionProfile().name.should.equal('defaultProfile');
            const bobCard = cards.get('bob1@bond-network');
            bobCard.should.be.an.instanceOf(IdCard);
            bobCard.getUserName().should.equal('bob1');
            bobCard.getEnrollmentCredentials().secret.should.equal('bobSecret');
            bobCard.getBusinessNetworkName().should.equal('bond-network');
            bobCard.getConnectionProfile().name.should.equal('defaultProfile');
        });

    });

    describe('#delete', () => {

        it('should delete the specified business network card', async () => {
            await cardStore.delete('alice1@bond-network');
            const card = await Card.findOne({ where: { name: 'alice1@bond-network' }});
            should.equal(card, null);
        });

        it('should throw an error if the specified business network card does not exist', async () => {
            await cardStore.delete('charlie1@bond-network')
                .should.be.rejectedWith(/The business network card.*does not exist/);
        });

    });

    describe('#has', () => {

        it('should return true if the specified business network card exists', async () => {
            const result = await cardStore.has('alice1@bond-network');
            result.should.be.true;
        });

        it('should return false if the specified business network card does not exist', async () => {
            const result = await cardStore.has('charlie1@bond-network');
            result.should.be.false;
        });

    });

    describe('#getWallet', () => {

        it('should return a wallet for the specified business network card', async () => {
            const wallet = await cardStore.getWallet('alice1@bond-network');
            wallet.should.be.an.instanceOf(Wallet);
            const names = await wallet.listNames();
            names.should.deep.equal(['test1', 'test2']);
        });

        it('should throw an error if the specified business network card does not exist', async () => {
            await cardStore.getWallet('charlie1@bond-network')
                .should.be.rejectedWith(/The business network card.*does not exist/);
        });

    });

});
