<?php
namespace Socketty;

use Symfony\Component\HttpFoundation\Session\SessionInterface;

interface AuthorizerInterface{
    /**
     * @param $session  SessionInterface|null
     * @param $cmd      string
     * @param $args     string
     *
     * @return bool     true if authorized, false if not
     */
    public function check(SessionInterface $session = null, $cmd, $args);
}