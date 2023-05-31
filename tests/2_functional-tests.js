const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    this.timeout(50000);
    test('Test: Viewing one stock', function (done) {
        chai
            .request(server)
            .keepOpen()
            .get('/api/stock-prices/?stock=ABC&like=false')
            .end(function (err, res) {
                assert.equal(res.status, 200); 
                assert.match(res.text, /^\{"stock":"ABC","price":\d+\.*\d*,"likes":\d+\}$/);
                done();
            })
    });
    test('Test: Viewing one stock and liking it', function (done) {
        chai
            .request(server)
            .get('/api/stock-prices/?stock=ABC&like=true')
            .end(function (err, res) {
                assert.equal(res.status, 200); 
                assert.match(res.text, /^\{"stock":"ABC","price":\d+\.*\d*,"likes":\d+\}$/);
                done();
            });
            
    });
    test('Test: Viewing the same stock and liking it again', function (done) {
        chai
            .request(server)
            .keepOpen()
            .get('/api/stock-prices/?stock=ABC&like=true')
            .end(function (err, res1) {
                assert.equal(res1.status, 200); 
                assert.match(res1.text, /^\{"stock":"ABC","price":\d+\.*\d*,"likes":\d+\}$/);
                
                chai
                    .request(server)
                    .get('/api/stock-prices/?stock=ABC&like=true')
                    .end(function (err, res2) {
                        assert.equal(res2.status, 200);
                        assert.match(res2.text, /^\{"stock":"ABC","price":\d+\.*\d*,"likes":\d+\}$/);
                        assert.equal(JSON.parse(res2.text)["likes"], JSON.parse(res1.text)["likes"]);
                        done();
                    });
            });
    });
    test('Test: Viewing two stocks', function (done) {
        chai
            .request(server)
            .keepOpen()
            .get('/api/stock-prices/?stock=ABC&stock=DEF&like=false')
            .end(function (err, res) {
                assert.equal(res.status, 200); 
                assert.match(res.text, /^\{"stockData":\[\{"stock":"ABC","price":\d+\.*\d*,"rel_likes":[-]*\d+\},\{"stock":"DEF","price":\d+\.*\d*,"rel_likes":[-]*\d+\}\]\}$/);
                done();
            })
    });

    test('Test: Viewing two stocks and liking them', function (done) {
        chai
            .request(server)
            .keepOpen()
            .get('/api/stock-prices/?stock=ABC&stock=DEF&like=true')
            .end(function (err, res) {
                assert.equal(res.status, 200); 
                assert.match(res.text, /^\{"stockData":\[\{"stock":"ABC","price":\d+\.*\d*,"rel_likes":[-]*\d+\},\{"stock":"DEF","price":\d+\.*\d*,"rel_likes":[-]*\d+\}\]\}$/);
                done();
            })
    });


});
