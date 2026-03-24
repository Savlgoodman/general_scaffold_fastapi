package com.scaffold.admin.service;

import com.scaffold.admin.model.vo.OnlineUserVO;

import java.util.List;

/**
 * 在线用户服务接口
 */
public interface OnlineUserService {

    /**
     * 获取在线用户列表
     */
    List<OnlineUserVO> listOnlineUsers();

    /**
     * 强制用户下线
     */
    void forceOffline(Long userId);
}
