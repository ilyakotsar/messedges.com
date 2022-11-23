let p = '';
let recipient_public_key = '';
let senders = [];
let texts = [];
let sent = [];
let last_sent = '';
let my_username = '';
let secret_key = '';
let allow_get_messages = false;

function getRoomData() {
    let room_name = document.getElementsByName('room-name')[0].value;
    let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
    axios({
        method: 'post',
        url: '/rooms/' + room_name,
        headers: {
            'X-CSRFToken': csrf_token
        },
        data: {
            get_room_data: true
        }
    }).then(function (response) {
        p = response.data['p']
        recipient_public_key = response.data['recipient_public_key']
        senders = response.data['senders']
        texts = response.data['texts']
        sent = response.data['sent']
        last_sent = response.data['last_sent']
        my_username = response.data['my_username']
        if (texts.length > 0) {
            document.getElementById('first-messages').style.display = 'none';
            for (let i = 0; i < texts.length; i++) {
                if (senders[i] == my_username) {
                    document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + texts[i] + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                } else {
                    document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + texts[i] + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                }
            }
            window.scrollTo(0, document.body.scrollHeight);
        }
    });
}

function enterPrivateKey() {
    let private_key = '';
    if (allow_get_messages == false) {
        private_key = document.getElementById('private-key').value;
        if (private_key.length > 0) {
            let private_key_number = passwordToNumber(private_key);
            secret_key = bigInt(recipient_public_key).modPow(private_key_number, p).toString();
            if (texts.length > 0) {
                for (let i = 0; i < texts.length; i++) {
                    let ciphertext = texts[i];
                    let bytes  = CryptoJS.AES.decrypt(ciphertext, secret_key);
                    let plaintext = bytes.toString(CryptoJS.enc.Utf8);
                    if (plaintext.length > 0) {
                        if (i == 0) {
                            document.getElementById('chat-body').innerHTML = '';
                        }
                        if (senders[i] == my_username) {
                            document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + plaintext + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                        } else {
                            document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + plaintext + '<div class="text-end muted-color"><small>' + sent[i] + '</small></div></div></div>';
                        }
                        document.getElementById('lock-btn').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
                        document.getElementById('lock-btn').className = 'btn btn-nav text-success';
                        allow_get_messages = true;
                        window.scrollTo(0, document.body.scrollHeight);
                    } else {
                        secret_key = '';
                    }
                }
            } else {
                document.getElementById('lock-btn').innerHTML = '<i class="fa-solid fa-lock-open"></i>';
                document.getElementById('lock-btn').className = 'btn btn-nav text-success';
                allow_get_messages = true;
            }
        }
    } else {
        if (texts.length > 0) {
            document.getElementById('private-key').value = private_key;
        } else {
            private_key = document.getElementById('private-key').value;
            if (private_key.length > 0) {
                let private_key_number = passwordToNumber(private_key);
                secret_key = bigInt(recipient_public_key).modPow(private_key_number, p).toString();
            }
        }
    }
}

function sendMessage() {
    if (secret_key.length > 4990) {
        getNewMessages();
        let message = document.getElementById('message').value;
        if (message.trim() != '') {
            let ciphertext = CryptoJS.AES.encrypt(message, secret_key).toString();
            let room_name = document.getElementsByName('room-name')[0].value;
            let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
            axios({
                method: 'post',
                url: '/rooms/' + room_name,
                headers: {
                    'X-CSRFToken': csrf_token
                },
                data: {
                    new_text: ciphertext
                }
            }).then(function (response) {
                if (response.data['sent']) {
                    document.getElementById('chat-body').innerHTML += '<div class="d-flex justify-content-end"><div class="sender">' + message + '<div class="text-end muted-color"><small>' + response.data['sent'] + '</small></div></div></div>';
                    document.getElementById('message').value = '';
                    window.scrollTo(0, document.body.scrollHeight);
                } else {
                    alert('Error: limit exceeded')
                }
            });
        } else {
            document.getElementById('message').value = '';
        }
    } else {
        $('#private-key-modal').modal('show');
    }
}

function getNewMessages() {
    if (allow_get_messages == true) {
        let room_name = document.getElementsByName('room-name')[0].value;
        let csrf_token = document.getElementsByName('csrfmiddlewaretoken')[0].value;
        axios({
            method: 'post',
            url: '/rooms/' + room_name,
            headers: {
                'X-CSRFToken': csrf_token
            },
            data: {
                last_sent: last_sent
            }
        }).then(function (response) {
            if (response.data['texts']) {
                if (response.data['texts'].length > 0) {
                    for (let i = 0; i < response.data['texts'].length; i++) {
                        let ciphertext = response.data['texts'][i];
                        let bytes  = CryptoJS.AES.decrypt(ciphertext, secret_key);
                        let plaintext = bytes.toString(CryptoJS.enc.Utf8);
                        document.getElementById('chat-body').innerHTML += '<div class="d-flex"><div class="recipient">' + plaintext + '<div class="text-end muted-color"><small>' + response.data['sent'][i] + '</small></div></div></div>';
                    }
                    last_sent = response.data['last_sent'];
                    if (!('Notification' in window)) {
                    } else if (Notification.permission === 'granted') {
                        let n = new Notification('New message');
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission(function (permission) {
                            if (permission === 'granted') {
                                let n = new Notification('New message');
                            }
                        });
                    }
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }
        });
    }
}

function passwordToNumber(password) {
    let number = '';
    for (let i = 0; i < password.length; i++) {
        let char_code = password[i].charCodeAt();
        number += char_code.toString();
    }
    return number;
}

document.querySelector('#message').onkeyup = function(event) {
    if ($('#private-key-modal').is(':visible') == false) {
        if (event.keyCode == 13) {
            document.getElementById('send-message').click();
        }
    }
}

document.querySelector('#private-key').onkeyup = function(event) {
    if ($('#private-key-modal').is(':visible') == true) {
        if (event.keyCode == 13) {
            document.getElementById('enter-private-key').click();
        }
    }
}

window.onbeforeunload = function() {
    if (secret_key.length > 0) {
        return '';
    }
}

getRoomData();
setInterval(getNewMessages, 2000);
