import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        // Datos de usuario y perfil
        appUser: { profile: {} },
        // Gente disponible en la app para "conectar"
        people: [],
        // Contactos del usuarios
        contacts: [],
        // Conversaciones entre el usuario y cada contacto        
        conversations: [],
        // Usuario seleccionado actualmente, ya sea contacto o no
        selectedUser: { profile: {} },
        // Conversacion seleccionada
        selectedConversation: {}
    },
    getters: {
        // Obtiene la conversacion entre 2 usuarios usando el id de usuario
        getConversationWith: (state, getters) => (userId) => {
            return state.conversations.find(conversation =>
                conversation.participants[0].id === userId
                || conversation.participants[1].id === userId);
        },
        // Obtiene una conversacion directamente con el id de conversacion
        getConversationById: (state, getters) => (conversationId) => {
            return state.conversations.find(
                conversation => conversation.id === conversationId);
        },
        // Obtiene un usuario del array "People" es decir NO CONTACTOS
        getPeopleById: (state, getters) => (userId) => {
            return state.people.find(user => user.id === userId);
        },
        // Obtiene un usuario del array "Contacts"
        getContactById: (state, getters) => (userId) => {
            return state.contacts.find(user => user.id === userId);
        },
        // Obtiene un usuario buscando en People y Contacts
        getUserById: (state, getters) => (userId) => {
            var user = getters.getContactById(userId);
            if (typeof user === 'undefined') {
                return getters.getPeopleById(userId);
            }
            return user;
        },
        // Comprueba si un usuario esta en nuestra lista de contactos
        isContact: (state, getters) => (userId) => {
            if (typeof getters.getContactById(userId) === 'undefined') {
                return false;
            }
            return true;
        },
        // Devuelve el usuario al otro lado de la conversacion (receiver)
        // El metodo devuelve el usuario cuyo ID no coincide con el del usuario
        // logeado en la aplicacion (nosotros).
        getUserFromSelectedConversation: (state, getters) => {
            // Si nuestro ID de usuario es igual al del primer participante de
            // la conversacion, devolvemos el segundo usuario.
            if (state.appUser.id === state.selectedConversation.participants[0].id) {
                return state.selectedConversation.participants[1];
            }
            return state.selectedConversation.participants[0];
        },
    },
    mutations: {
        // Asigna el usuario de la app
        SET_USER(state, appUser) {
            state.appUser = appUser
        },
        // Asigna los contactos del usuario
        SET_CONTACTS(state, contacts) {
            state.contacts = contacts
        },
        // Asigna los usuarios disponibles en la app que no son contactos
        SET_PEOPLE(state, people) {
            state.people = people
        },
        // Asigna las conversaciones
        SET_CONVERSATIONS(state, conversations) {
            state.conversations = conversations;
        },
        // Selecciona un usuario
        SET_SELECTED_USER(state, user) {
            state.selectedUser = user;
        },
        // Selecciona una conversacion
        SET_SELECTED_CONVERSATION(state, conversation) {
            state.selectedConversation = conversation;
        },
        REMOVE_CONTACT(state, index) {
            Vue.delete(state.contacts, index);
        },
        REMOVE_PEOPLE(state, index) {
            Vue.delete(state.people, index);
        },
        ADD_CONTACT(state, contact) {
            state.contacts.push(contact);
        },
        ADD_CONVERSATION(state, conversation) {
            state.conversations.push(conversation);
        },
        // state, message
        // {conversation_id, message}
        ADD_MESSAGE(state, payload) {
            // Agregamos el mensaje a la conversacion
            payload.conversation.messages.push(payload.message);
        },
        // state, people
        ADD_PEOPLE(state, payload) {
            state.people.push(payload.people);
        },
    },
    actions: {
        selectUserById(context, data) {
            var user = context.getters.getUserById(data.userId);
            context.commit('SET_SELECTED_USER', user);
        },
        // Selecciona una conversacion por su id
        selectConversationById(context, data) {
            var conversation = context.getters.getConversationById(data.conversationId);
            context.commit('SET_SELECTED_CONVERSATION', conversation);
        },
        removeContactById(context, data) {
            var contactIndex = context.state.contacts.findIndex(
                user => user.id === data.userId);
            context.commit('REMOVE_CONTACT', contactIndex);
        },
        removePeopleById(context, data) {
            var peopleIndex = context.state.people.findIndex(user => user.id === data.userId);
            context.commit('REMOVE_PEOPLE', peopleIndex);
        },
        messageToConversation(context, message) {
            var conversation = context.getters.getConversationById(
                message.conversation_id);

            if (typeof conversation === 'undefined') {
                conversation = { id: message.conversation_id, messages: [] };
                context.commit('ADD_CONVERSATION', conversation);
            }

            // context.commit('ADD_MESSAGE', { conversationId: conversation.id,
            // message: message.content }
            // });
            context.commit('ADD_MESSAGE', { message, conversation });
        },
        // Envia los datos del perfil actualizado a la base de datos
        saveProfile(context) {
            var profile = context.state.appUser.profile;
            axios.post("http://127.0.0.1:8000/profile/" + profile.id, {
                profile: profile,
                _method: "put"
            });
        },
        // Envio de mensajes al servidor
        postMessage(context, message) {
            var conversation_id = context.state.selectedConversation.id;
            axios.post("http://127.0.0.1:8000/conversation/" + conversation_id, {
                message: message
            }).then(function (response) {
                // Si el request tuvo exito (codigo 200)
                if (response.status == 200) {
                    var message = response['data'];
                    // Si no hay datos ...
                    if (message.length == 0) {
                        return;
                    }

                    context.dispatch('messageToConversation', message);
                }
            });
        },
        // Peticion para borrar un contacto
        // context, user
        deleteContact(context, data) {
            axios.post("http://127.0.0.1:8000/contacts/" + data.userId, {
                _method: "delete"
            }).then(function (response) {
                // Si el request tuvo exito (codigo 200)
                if (response.status == 204) {
                    var user = context.getters.getUserById(data.userId);

                    // Borramos el usuario de contactos
                    context.dispatch("removeContactById", { userId: user.id });

                    // Movemos el contacto a people
                    context.commit('ADD_PEOPLE', { people: user });
                }
            });
        },
        // Peticion para agregar un contacto
        saveContact(context, data) {
            axios.post("http://127.0.0.1:8000/contacts/", {
                user_id: data.userId
            }).then(function (response) {
                // Si el request tuvo exito (codigo 200)
                if (response.status == 200) {
                    // Agregamos una nueva conversacion si existe el objeto
                    if (response['data'].length == 0) {
                        return;
                    }

                    var userContact = response['data']['contact'];
                    var conversation = response['data']['conversation'];
                    // Borramos a la persona que hemos agregado de People
                    context.dispatch("removePeopleById", { userId: userContact.id });

                    // Agregamos el nuevo contacto usando los datos recibidos
                    context.commit("ADD_CONTACT", userContact);

                    // Comprobamos que no exista ninguna conversacion con el mismo id
                    if (typeof context.getters.getConversationById(
                        conversation.id) === 'undefined') {
                        context.commit('ADD_CONVERSATION', conversation);
                    }
                }
            });
        },
        // Peticion al servidor para recibir los nuevos mensajes
        fetchLastMessages(context) {
            axios.get("http://127.0.0.1:8000/conversations/update").then(function (response) {
                // Si el request tuvo exito (codigo 200)
                if (response.status == 200) {
                    var messages = response['data']['messages'];
                    // Si no hay datos ...
                    if (messages.length == 0) {
                        return;
                    }

                    // Iteramos sobre los datos
                    for (var index in messages) {
                        var message = messages[index];
                        context.dispatch('messageToConversation', message);
                    }
                }

            });
        },
        // ---------------------
        // Actualiza datos de la aplicacion
        update(context) {
            if (data.length > 0) {
                if (data['app_user']) {
                    // Update user
                }

                if (data['conversation']) {
                    // Update conversation, add messages
                    // if converssation exists
                    // merge messages
                    // else
                    // push conversation
                }

                if (data['user']) {
                    // Update user profile
                }
            }
        },
        fetch(context) {
            axios.get("http://127.0.0.1:8000/messenger/fetch").then(function (response) {
                // Si el request tuvo exito (codigo 200)
                if (response.status == 200) {
                    var data = response["data"];
                    // Userdata
                    context.commit('SET_USER', data['app_user']);
                    // People
                    context.commit('SET_PEOPLE', data['people']);
                    // Contacts
                    context.commit('SET_CONTACTS', data['contacts']);
                    // Conversations
                    context.commit('SET_CONVERSATIONS', data['conversations']);
                }
            });
        },
    }
})
