package com.scaffold.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.scaffold.admin.annotation.OperationLog;
import com.scaffold.admin.common.BusinessException;
import com.scaffold.admin.common.ResultCode;
import com.scaffold.admin.mapper.AdminNoticeMapper;
import com.scaffold.admin.model.dto.CreateNoticeDTO;
import com.scaffold.admin.model.dto.UpdateNoticeDTO;
import com.scaffold.admin.model.entity.AdminNotice;
import com.scaffold.admin.model.enums.OperationType;
import com.scaffold.admin.service.NoticeService;
import com.scaffold.admin.service.impl.AdminUserServiceImpl.AdminUserDetails;
import com.scaffold.admin.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService {

    private final AdminNoticeMapper noticeMapper;

    @Override
    public Page<AdminNotice> getPage(Integer pageNum, Integer pageSize, String keyword, String type, String status) {
        Page<AdminNotice> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<AdminNotice> query = new LambdaQueryWrapper<>();

        if (keyword != null && !keyword.isBlank()) {
            query.like(AdminNotice::getTitle, keyword);
        }
        if (type != null && !type.isBlank()) {
            query.eq(AdminNotice::getType, type);
        }
        if (status != null && !status.isBlank()) {
            query.eq(AdminNotice::getStatus, status);
        }

        query.orderByDesc(AdminNotice::getIsTop)
             .orderByDesc(AdminNotice::getPublishTime)
             .orderByDesc(AdminNotice::getCreateTime);

        return noticeMapper.selectPage(page, query);
    }

    @Override
    public AdminNotice getById(Long id) {
        return noticeMapper.selectById(id);
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.CREATE)
    public AdminNotice create(CreateNoticeDTO dto) {
        String type = dto.getType() != null ? dto.getType() : "notice";
        if ("announcement".equals(type) && (dto.getContent() == null || dto.getContent().isBlank())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "公告内容不能为空");
        }
        AdminNotice notice = new AdminNotice();
        notice.setTitle(dto.getTitle());
        notice.setContent(dto.getContent());
        notice.setType(type);
        notice.setStatus("draft");
        notice.setIsTop(0);
        noticeMapper.insert(notice);
        return notice;
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.UPDATE)
    public AdminNotice update(Long id, UpdateNoticeDTO dto) {
        AdminNotice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        if (!"draft".equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "仅草稿状态可编辑");
        }
        if (dto.getTitle() != null) notice.setTitle(dto.getTitle());
        if (dto.getContent() != null) notice.setContent(dto.getContent());
        if (dto.getType() != null) notice.setType(dto.getType());
        noticeMapper.updateById(notice);
        return notice;
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.DELETE)
    public void delete(Long id) {
        AdminNotice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        noticeMapper.deleteById(id);
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.UPDATE, description = "发布公告")
    public void publish(Long id) {
        AdminNotice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        if (!"draft".equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "仅草稿状态可发布");
        }
        notice.setStatus("published");
        notice.setPublishTime(LocalDateTime.now());
        AdminUserDetails currentUser = SecurityUtils.getCurrentUser();
        if (currentUser != null) {
            notice.setPublisherId(currentUser.getId());
            notice.setPublisherName(currentUser.getUsername());
        }
        noticeMapper.updateById(notice);
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.UPDATE, description = "撤回公告")
    public void withdraw(Long id) {
        AdminNotice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        if (!"published".equals(notice.getStatus())) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "仅已发布状态可撤回");
        }
        notice.setStatus("withdrawn");
        noticeMapper.updateById(notice);
    }

    @Override
    @Transactional
    @OperationLog(module = "通知公告", type = OperationType.UPDATE, description = "切换置顶")
    public void toggleTop(Long id) {
        AdminNotice notice = noticeMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException(ResultCode.NOT_FOUND, "公告不存在");
        }
        notice.setIsTop(notice.getIsTop() == 1 ? 0 : 1);
        noticeMapper.updateById(notice);
    }
}
