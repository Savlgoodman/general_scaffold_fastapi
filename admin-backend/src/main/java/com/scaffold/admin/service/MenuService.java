package com.scaffold.admin.service;

import com.scaffold.admin.model.dto.CreateMenuDTO;
import com.scaffold.admin.model.dto.SortMenuDTO;
import com.scaffold.admin.model.dto.UpdateMenuDTO;
import com.scaffold.admin.model.vo.MenuVO;

import java.util.List;

public interface MenuService {

    List<MenuVO> getMenuTree();

    List<MenuVO> getUserMenuTree(Long userId);

    MenuVO getMenuById(Long id);

    void createMenu(CreateMenuDTO dto);

    void updateMenu(Long id, UpdateMenuDTO dto);

    void deleteMenu(Long id);

    void sortMenus(List<SortMenuDTO.SortMenuDTOItem> items);
}
