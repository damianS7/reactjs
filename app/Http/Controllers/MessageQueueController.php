<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\MessageQueue;
use App\Conversation;
use App\User;
use App\Message;

class MessageQueueController extends Controller
{
    public static function messageToQueue($message)
    {
        $queueMessage = new MessageQueue();
        $queueMessage->to_user_id = $message->author_id;
        $queueMessage->message_id = $message->id;
        $queueMessage->save();
    }

    public function fetchMessagesFromQueue($user_id)
    {
        // SELECT messages.* FROM messages
        // INNER JOIN message_queue ON message_queue.message_id = messages.id
        // WHERE message_queue.to_user_id = 1
        $messages = Message::select(['messages.*'])
        ->join('message_queue', 'messages.id', '=', 'messages_queue.message_id')
        ->where('message_queue.to_user_id', $user_id)
        ->get();

        //Message::delete();
        return $messages;
    }
}